from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ATTENDANT = "ATTENDANT"
    STUDENT = "STUDENT"


class OrderStatus(str, Enum):
    QUEUE = "QUEUE"
    WASHING = "WASHING"
    DRYING = "DRYING"
    IRONING = "IRONING"
    READY = "READY TO COLLECT"
    COLLECTED = "COLLECTED"
