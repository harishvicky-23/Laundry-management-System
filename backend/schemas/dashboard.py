from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    today_orders: int
    in_process: int
    ready: int
    COLLECTED_today: int