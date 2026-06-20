from random import randint, choice, sample
from sqlalchemy.orm import Session
from config.db import SessionLocal
from models.user import User
from models.student import Student
from models.attendant import Attendant
from models.service import Service
from models.order import Order
from models.order_item import OrderItem
from auth.hashing import hash_password

from models.enums import (
    UserRole,
    OrderStatus
)


db: Session = SessionLocal()


def seed_admin():
    admin = User(
        username="admin",
        password=hash_password("pass123"),
        role=UserRole.ADMIN.value
    )

    db.add(admin)
    db.commit()

    print("Admin created")


def seed_attendants():
    attendants = []

    for i in range(1, 4):
        user = User(
            username=f"attendant{i}",
            password=hash_password("pass123"),
            role=UserRole.ATTENDANT.value
        )

        db.add(user)
        db.flush()

        attendant = Attendant(
            user_id=user.id,
            name=f"Attendant {i}",
            phone=f"98765432{i:02d}"
        )

        db.add(attendant)

        attendants.append(attendant)

    db.commit()

    print("Attendants created")

    return attendants


def seed_students():
    students = []

    departments = [
        "AI&DS",
        "CSE",
        "ECE",
        "EEE",
        "MECH"
    ]

    hostels = [
        "Boys Hostel A",
        "Boys Hostel B",
        "Girls Hostel A"
    ]

    for i in range(1, 21):

        user = User(
            username=f"student{i}",
            password=hash_password("pass123"),
            role=UserRole.STUDENT.value
        )

        db.add(user)
        db.flush()

        student = Student(
            user_id=user.id,
            roll_number=f"AI22{i:03d}",
            name=f"Student {i}",
            department=choice(departments),
            hostel_name=choice(hostels),
            balance=1000
        )

        db.add(student)

        students.append(student)

    db.commit()

    print("Students created")

    return students


def seed_services():

    services_data = [
        ("Wash", "kg", 60),
        ("Iron", "piece", 7),
        ("Dry", "kg", 70)]

    services = []

    for name, unit, price in services_data:

        service = Service(
            name=name,
            unit=unit,
            price=price
        )

        db.add(service)

        services.append(service)

    db.commit()

    print("Services created")

    return services


def seed_orders(students, attendants, services):

    statuses = [
        OrderStatus.QUEUE,
        OrderStatus.WASHING,
        OrderStatus.DRYING,
        OrderStatus.IRONING,
        OrderStatus.READY,
        OrderStatus.COLLECTED
    ]

    for _ in range(30):

        student = choice(students)
        attendant = choice(attendants)

        order = Order(
            student_id=student.id,
            attendant_id=attendant.id,
            status=choice(statuses),
            total_amount=0
        )

        db.add(order)
        db.flush()

        total = 0

        selected_services = sample(
            services,
            randint(1, 3)
        )

        for service in selected_services:

            quantity = randint(1, 5)

            subtotal = (
                service.price *
                quantity
            )

            item = OrderItem(
                order_id=order.id,
                service_id=service.id,
                quantity=quantity,
                unit_price=service.price,
                subtotal=subtotal
            )

            db.add(item)

            total += subtotal

        order.total_amount = total

    db.commit()

    print("Orders created")


def main():

    seed_admin()

    attendants = seed_attendants()

    students = seed_students()

    services = seed_services()

    seed_orders(
        students,
        attendants,
        services
    )

    print()
    print("=" * 50)
    print("Dummy data inserted")
    print("=" * 50)
    print()
    print("Admin")
    print("username: admin")
    print("password: pass123")
    print()
    print("Attendants")
    print("username: attendant1")
    print("password: pass123")
    print()
    print("Students")
    print("username: student1")
    print("password: pass123")


if __name__ == "__main__":
    main()