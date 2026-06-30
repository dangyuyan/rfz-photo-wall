from __future__ import annotations

from app.schemas.person import Person
from app.services.db import get_db


class PersonAlreadyExistsError(ValueError):
    pass


def list_persons() -> list[Person]:
    with get_db() as connection:
        rows = connection.execute(
            "SELECT id, name FROM persons ORDER BY id"
        ).fetchall()

    return [Person.model_validate(dict(row)) for row in rows]


def create_person(name: str) -> Person:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("请输入成员名字")

    with get_db() as connection:
        existing_row = connection.execute(
            "SELECT id, name FROM persons WHERE name = ? LIMIT 1",
            (clean_name,),
        ).fetchone()

        if existing_row is not None:
            raise PersonAlreadyExistsError("该成员已存在，不能重复添加")

        cursor = connection.execute(
            "INSERT INTO persons(name) VALUES (?)",
            (clean_name,),
        )
        person_id = cursor.lastrowid

        if person_id is None:
            raise RuntimeError("新增成员失败")

        created_row = connection.execute(
            "SELECT id, name FROM persons WHERE id = ?",
            (person_id,),
        ).fetchone()

    if created_row is None:
        raise RuntimeError("新增成员失败")

    return Person.model_validate(dict(created_row))
