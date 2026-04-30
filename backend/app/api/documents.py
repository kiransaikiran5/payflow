from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os, uuid
from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import Document, Employee, User
from app.schemas.schemas import DocumentResponse

router = APIRouter(prefix="/api/documents", tags=["Documents"])
UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    employee_id: int,
    document_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403)
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    file_url = f"/uploads/documents/{filename}"
    doc = Document(employee_id=employee_id, document_type=document_type, file_url=file_url)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/", response_model=list[DocumentResponse])
def get_documents(employee_id: int = None, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_active_user)):
    query = db.query(Document)
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp: query = query.filter(Document.employee_id == emp.id)
    elif employee_id:
        query = query.filter(Document.employee_id == employee_id)
    return query.all()