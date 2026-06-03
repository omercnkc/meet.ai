from pydantic import BaseModel, Field
from typing import List, Optional

class N8nAssignee(BaseModel):
    userId: str = Field(..., alias="userId")
    name: str
    email: str

    class Config:
        populate_by_name = True

class N8nTaskDetail(BaseModel):
    id: str
    title: str
    status: str
    createdAt: str

class N8nTaskAssignedPayload(BaseModel):
    event: str = "task_assigned"
    meetingId: str
    task: N8nTaskDetail
    assignees: List[N8nAssignee]

    class Config:
        populate_by_name = True
