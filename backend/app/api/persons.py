from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.common import ApiResponse
from app.schemas.person import CreatePersonRequest, Person
from app.services.persons import (
    PersonAlreadyExistsError,
    PersonNotFoundError,
    create_person,
    delete_person,
    list_persons,
)

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.get("", response_model=ApiResponse[list[Person]])
def get_persons() -> ApiResponse[list[Person]]:
    return ApiResponse(data=list_persons())


@router.post("", response_model=ApiResponse[Person], status_code=status.HTTP_201_CREATED)
def post_person(payload: CreatePersonRequest) -> ApiResponse[Person]:
    try:
        person = create_person(payload.name)
    except PersonAlreadyExistsError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ApiResponse(data=person, message="成员创建成功")


@router.delete("/{person_id}", response_model=ApiResponse[dict[str, int]])
def remove_person(person_id: int) -> ApiResponse[dict[str, int]]:
    try:
        delete_person(person_id)
    except PersonNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return ApiResponse(data={"id": person_id}, message="成员删除成功")
