from pydantic import BaseModel
from typing import Any, Optional

class SuccessResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    code: int = 400
    message: str = "error"
    details: Optional[Any] = None