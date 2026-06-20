from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from calendar import monthrange
from datetime import datetime,UTC
from config.db import Base, engine, get_db
from models.user import User
from models.student import Student
from models.attendant import Attendant
from models.service import Service
from models.order import Order
from models.order_item import OrderItem
from models.enums import UserRole,OrderStatus
from schemas.user import (AdminCreate,LoginRequest,LoginResponse,UserResponse,TokenResponse)
from schemas.order import (AttendantOrderResponse,OrderCreate,OrderStatusUpdate,OrderStatusResponse,StudentOrderResponse)
from schemas.service import (ServiceCreate,ServiceUpdate,ServiceResponse)
from schemas.student import StudentCreate,StudentUpdate,StudentResponse,StudentDashboardDataResponse,TopUpRequest
from schemas.attendant import AttendantCreate,AttendantUpdate,AttendantResponse
from schemas.dashboard import DashboardSummaryResponse
from auth.hashing import hash_password,verify_password
from auth.jwt_handler import create_access_token
from auth.dependencies import get_current_user
from auth.permissions import (require_admin,require_attendant,require_student,require_staff)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import joinedload



app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def get_user_by_username(db: Session, username: str):
    return (
        db.query(User)
        .filter(User.username == username)
        .first()
    )


def ensure_username_available(db: Session, username: str):
    if get_user_by_username(db, username):
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )


#ROOT:
@app.get("/")
def root():
    return {"message": "Laundry Management System API Running"}

#Login:
@app.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest,db: Session = Depends(get_db)):
    user = get_user_by_username(db, payload.username)
    if not user: #user is a object from db (1 row):
        raise HTTPException(
            status_code=401,
            detail="Invalid user or password"
        )
    if not verify_password(payload.password,user.password ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    profile_id = None

    if user.role == UserRole.STUDENT.value and user.student:
        profile_id = user.student.id

    if user.role == UserRole.ATTENDANT.value and user.attendant:
        profile_id = user.attendant.id


    access_token = create_access_token(
    {
        "user_id": user.id,
        "role": user.role
    }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


#Student endpoints:

#refresh profile
@app.get("/student/profile", response_model=StudentResponse)
def get_my_profile(current_user: User = Depends(require_student),db: Session = Depends(get_db)):
    student = current_user.student  
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    return student

#refresh orders
@app.get("/student/orders",response_model=list[StudentOrderResponse])
def get_my_orders(current_user: User = Depends(require_student),db: Session = Depends(get_db)):
    student = current_user.student

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    return (
        db.query(Order).filter(Order.student_id == student.id)
        .order_by(Order.created_at.desc())
        .all()
    )

#refresh recent orders
@app.get("/student/recentOrders",response_model=list[StudentOrderResponse])
def get_my_recent_orders(current_user: User = Depends(require_student),db: Session = Depends(get_db)):
    student = current_user.student
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    return (
        db.query(Order).filter(Order.student_id == student.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

#entire page
@app.get("/student/dashboard", response_model=StudentDashboardDataResponse)
def get_student_dashboard_data(current_user: User = Depends(require_student),db: Session = Depends(get_db)):
    student = current_user.student
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    orders = (
        db.query(Order)
        .filter(Order.student_id == student.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return {
        "profile": student,
        "all_orders": orders,
        "recent_orders": orders[:5]
    }

##dont touch anything above




#Admin managemnet:

@app.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(current_user: User = Depends(require_staff),db: Session = Depends(get_db)):
    today = datetime.now(UTC).date()
    today_start = datetime.combine(today, datetime.min.time())

    today_orders = (db.query(Order).filter(Order.created_at >= today_start).count())

    in_process = (db.query(Order).filter(Order.status != OrderStatus.COLLECTED).count())

    ready = (db.query(Order).filter(Order.status == OrderStatus.READY).count())

    COLLECTED_today = (
        db.query(Order)
        .filter(Order.status == OrderStatus.COLLECTED)
        .filter(Order.created_at >= today_start)
        .count()
    )

    return {
        "today_orders": today_orders,
        "in_process": in_process,
        "ready": ready,
        "COLLECTED_today": COLLECTED_today
    }

@app.get("/admin/students", response_model=list[StudentResponse])
def get_students(search: str | None = None, 
    page: int = 1,             
    limit: int = 10,           
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * limit
    query = db.query(Student)
    if search:
        query = query.filter(
            (Student.name.ilike(f"%{search}%")) | 
            (Student.roll_number.ilike(f"%{search}%"))
        )
    
    return query.order_by(Student.name.asc()).offset(skip).limit(limit).all()

@app.post("/admin/students/{student_id}/topup", response_model=StudentResponse)
def topup_student_balance(student_id: int,payload: TopUpRequest,current_user: User = Depends(require_admin),
                        db: Session = Depends(get_db)):
    if payload.amount <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Top-up amount must be greater than zero"
        )
        
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=404, 
            detail="Student not found"
        )
        
    from decimal import Decimal
    student.balance += Decimal(str(payload.amount))
    
    db.commit()
    db.refresh(student)

    return student

@app.post("/admin/createStudents", response_model=StudentResponse)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ensure_username_available(db, payload.username)
    
    existing_roll = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already exists")

    user = User(
        username=payload.username,
        password=hash_password(payload.password),
        role=UserRole.STUDENT.value
    )
    student_data = payload.model_dump(exclude={"username", "password"})

    try:
        db.add(user)
        db.flush() # Transaction sync step to generate user.id

        student = Student(user_id=user.id, **student_data)
        db.add(student)
        db.commit()
        db.refresh(student)
        return student
    except Exception:
        db.rollback()
        raise

@app.patch("/admin/updateStudents/{student_id}",response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)

    return student

@app.delete("/admin/students/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    user = db.query(User).filter(User.id == student.user_id).first()

    try:
        db.delete(student)
        if user:
            db.delete(user)
        db.commit()
        return {"message": "Student profile and account deleted successfully"}
    except Exception:
        db.rollback()
        raise



@app.get("/services", response_model=list[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(Service).order_by(Service.id.asc()).all()


@app.post("/services",response_model=ServiceResponse)
def create_service(
    payload: ServiceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = (
        db.query(Service)
        .filter(Service.name == payload.name)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Service already exists"
        )

    service = Service(**payload.model_dump())

    db.add(service)
    db.commit()
    db.refresh(service)

    return service

@app.patch("/services/{service_id}",response_model=ServiceResponse)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    service = (
        db.query(Service)
        .filter(Service.id == service_id)
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return service

@app.delete("/services/{service_id}")
def deactivate_service(service_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False 
    db.commit()

    return {"message": "Service deactivated successfully and hidden from future orders"}



@app.get("/admin/attendants", response_model=list[AttendantResponse])
def get_attendants(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(Attendant).order_by(Attendant.id.asc()).all()

@app.post("/admin/createAttendants", response_model=AttendantResponse)
def create_attendant(payload: AttendantCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    ensure_username_available(db, payload.username)
    user = User(
        username=payload.username,
        password=hash_password(payload.password),
        role=UserRole.ATTENDANT.value
    )
    try:
        db.add(user)
        db.flush()

        attendant = Attendant(
            user_id=user.id,
            name=payload.name,
            phone=payload.phone
        )
        db.add(attendant)
        db.commit()
        db.refresh(attendant)
        return attendant
    except Exception:
        db.rollback()
        raise

@app.patch("/admin/attendants/{attendant_id}", response_model=AttendantResponse)
def update_attendant(
    attendant_id: int,
    payload: AttendantUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    attendant = db.query(Attendant).filter(Attendant.id == attendant_id).first()
    if not attendant:   
        raise HTTPException(status_code=404, detail="Attendant not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(attendant, field, value)

    db.commit()
    db.refresh(attendant)
    return attendant

@app.delete("/admin/attendants/{attendant_id}")
def delete_attendant(
    attendant_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    attendant = db.query(Attendant).filter(Attendant.id == attendant_id).first()
    if not attendant:
        raise HTTPException(status_code=404, detail="Attendant not found")
    
    # Grab the corresponding record from the base users table
    user = db.query(User).filter(User.id == attendant.user_id).first()

    try:
        db.delete(attendant)
        if user:
            db.delete(user)
        db.commit()
        return {"message": "Attendant and login account deleted successfully"}
    except Exception:
        db.rollback()
        raise

#Dont touch anything above



#Attendant features:

@app.get("/attendant/profile",response_model=AttendantResponse)
def get_my_profile(current_user: User = Depends(require_attendant)):
    attendant = current_user.attendant
    if not attendant:
        raise HTTPException(
            status_code=404,
            detail="Attendant profile not found"
        )
    return attendant

@app.get("/attendant/orders/active", response_model=list[AttendantOrderResponse])
def get_active_orders(
    current_user: User = Depends(require_attendant),
    db: Session = Depends(get_db)
):
    return (
        db.query(Order)
        .filter(Order.status != OrderStatus.COLLECTED)
        .order_by(Order.created_at.asc())
        .all()
    )


@app.get("/attendant/orders/collected", response_model=list[AttendantOrderResponse])
def get_collected_history(page: int = 1, limit: int = 15, current_user: User = Depends(require_attendant), db: Session = Depends(get_db)):
    skip = (page - 1) * limit
    return (
        db.query(Order)
        .options(joinedload(Order.student)) # Eager loads student data in a single SQL JOIN
        .filter(Order.status == OrderStatus.COLLECTED)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

# 3. CREATE ORDER WITH AUTOMATIC BALANCE VALIDATION & DEDUCTION
@app.post("/attendant/createOrders", response_model=AttendantOrderResponse)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(require_attendant),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attendant = current_user.attendant
    if not attendant:
        raise HTTPException(status_code=404, detail="Attendant profile not found")

    # Match and fetch service details
    service_ids = {item.service_id for item in payload.items}
    services = db.query(Service).filter(Service.id.in_(service_ids), Service.is_active == True).all()
    services_by_id = {service.id: service for service in services}

    if len(service_ids) != len(services_by_id):
        raise HTTPException(status_code=404, detail="One or more selected services are invalid or inactive")

    try:
        # Create base order shell to obtain transaction ID
        order = Order(student_id=payload.student_id, attendant_id=attendant.id, total_amount=0)
        db.add(order)
        db.flush()

        from decimal import Decimal
        total_amount = Decimal('0')
        for item in payload.items:
            service = services_by_id[item.service_id]
            subtotal = service.price * Decimal(str(item.quantity))

            order_item = OrderItem(
                order_id=order.id,
                service_id=service.id,
                quantity=item.quantity,
                unit_price=service.price,
                subtotal=subtotal
            )
            db.add(order_item)
            total_amount += subtotal

        # WALLET CHECK VALIDATION: Protect system from negative balances
        if student.balance < total_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient student balance. Required: {total_amount}, Available: {student.balance}"
            )

        # Deduct wallet funds and update order total
        student.balance -= total_amount
        order.total_amount = total_amount

        db.commit()
        db.refresh(order)
        return order

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


# 4. SEARCH BY UNIQUE ID
@app.get("/attendant/orders/{order_id}", response_model=AttendantOrderResponse)
def get_order_by_id(
    order_id: int,
    current_user: User = Depends(require_attendant),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# 5. UPDATE STATUS
@app.patch("/attendant/updateOrderStatus/{order_id}/status", response_model=OrderStatusResponse)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(require_attendant),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order