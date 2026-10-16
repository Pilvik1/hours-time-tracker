from unittest.mock import Mock

from sqlalchemy.exc import IntegrityError

from time_tracker import models
from time_tracker.services.common import get_settings


def test_concurrent_settings_creation_recovers_from_insert_race():
    stored = models.UserSettings(id=1, timezone="UTC")
    db = Mock()
    db.get.side_effect = [None, stored]
    db.commit.side_effect = IntegrityError("INSERT", {}, RuntimeError("duplicate"))

    assert get_settings(db) is stored
    db.rollback.assert_called_once_with()
    db.refresh.assert_called_once_with(stored)
