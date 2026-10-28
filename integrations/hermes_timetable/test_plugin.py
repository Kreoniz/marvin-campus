"""Synthetic native contexts and fake transport only; no network/SDK needed."""

import contextvars
import email.message
import io
import json
import unittest
from unittest.mock import Mock

from . import TimetableTools, register

BOUND = {
    name: contextvars.ContextVar(name)
    for name in (
        "HERMES_SESSION_PLATFORM",
        "HERMES_SESSION_CHAT_TYPE",
        "HERMES_CRON_SESSION",
        "HERMES_SESSION_USER_ID",
        "HERMES_SESSION_CHAT_ID",
        "HERMES_SESSION_MESSAGE_ID",
    )
}


class Response(io.BytesIO):
    status = 200

    def __init__(self, body):
        super().__init__(json.dumps(body).encode())
        self.headers = email.message.Message()
        self.headers["Content-Type"] = "application/json"


class Tests(unittest.TestCase):
    def setUp(self):
        self.tokens = []
        for name, value in {
            "HERMES_SESSION_PLATFORM": "telegram",
            "HERMES_SESSION_CHAT_TYPE": "dm",
            "HERMES_CRON_SESSION": "",
            "HERMES_SESSION_USER_ID": "1",
            "HERMES_SESSION_CHAT_ID": "1",
            "HERMES_SESSION_MESSAGE_ID": "7",
        }.items():
            self.tokens.append((BOUND[name], BOUND[name].set(value)))
        self.tools = TimetableTools("https://campus.example", 1)
        self.tools.opener = Mock()

    def tearDown(self):
        for var, token in reversed(self.tokens):
            var.reset(token)

    def test_native_acl_before_any_request(self):
        for field, value in (
            ("HERMES_SESSION_USER_ID", "2"),
            ("HERMES_SESSION_CHAT_ID", "2"),
            ("HERMES_SESSION_PLATFORM", "cli"),
            ("HERMES_SESSION_CHAT_TYPE", "group"),
            ("HERMES_CRON_SESSION", "cron"),
            ("HERMES_SESSION_MESSAGE_ID", "0"),
        ):
            token = BOUND[field].set(value)
            try:
                result = self.tools.handle("omgtu_timetable_groups", {"term": "AB"})
                self.assertIn("OWNER_PRIVATE_TELEGRAM_REQUIRED", result)
            finally:
                BOUND[field].reset(token)
        self.tools.opener.open.assert_not_called()

    def test_strict_arguments_and_no_model_url_or_private_data(self):
        for name, args in (
            ("omgtu_timetable_groups", {"term": "AB", "mode": []}),
            ("omgtu_timetable_groups", {"term": "AB", "url": "https://other.example"}),
            ("omgtu_timetable_week", {"group_id": True, "week": "2026-10-26"}),
            ("omgtu_timetable_week", {"group_id": 1, "week": "2026-10-27"}),
            (
                "omgtu_timetable_week",
                {"group_id": 1, "week": "2026-10-26", "owner_id": 1},
            ),
        ):
            self.assertIn("INVALID_ARGUMENTS", self.tools.handle(name, args))
        self.tools.opener.open.assert_not_called()

    def test_cache_default_and_explicit_load_use_fixed_service_only_once(self):
        for mode in ("cache", "load"):
            self.tools.opener.open.return_value = Response(
                {
                    "state": "NOT_CACHED",
                    "mode": mode,
                    "source": "RUZ_PLANNED",
                    "membership": "DISPLAY_ONLY",
                }
            )
            args = {"group_id": 1, "week": "2026-10-26"}
            if mode != "cache":
                args["mode"] = mode
            result = json.loads(self.tools.handle("omgtu_timetable_week", args))
            self.assertEqual(result["code"], "OK")
            request = self.tools.opener.open.call_args.args[0]
            self.assertEqual(request.method, "GET")
            self.assertTrue(
                request.full_url.startswith(
                    "https://campus.example/api/v1/timetable/weeks/1?"
                )
            )
            self.assertIn("mode=" + mode, request.full_url)
        self.assertEqual(self.tools.opener.open.call_count, 2)

    def test_failure_never_retries_or_returns_an_empty_timetable(self):
        self.tools.opener.open.side_effect = TimeoutError
        self.assertEqual(
            json.loads(self.tools.handle("omgtu_timetable_groups", {"term": "AB"})),
            {"code": "TIMETABLE_UNAVAILABLE"},
        )
        self.tools.opener.open.assert_called_once()

    def test_registration_keeps_two_independent_names_and_fixed_context_gate(self):
        from unittest.mock import patch

        ctx = Mock()
        with patch.dict(
            "os.environ",
            {
                "CAMPUS_TIMETABLE_ORIGIN": "https://campus.example",
                "CAMPUS_TIMETABLE_OWNER_ID": "1",
            },
        ):
            register(ctx)
        self.assertEqual(
            [call.kwargs["name"] for call in ctx.register_tool.call_args_list],
            ["omgtu_timetable_groups", "omgtu_timetable_week"],
        )
        for call in ctx.register_tool.call_args_list:
            self.assertFalse(
                call.kwargs["schema"]["parameters"]["additionalProperties"]
            )
            self.assertIn("mode", call.kwargs["schema"]["parameters"]["properties"])

    def test_invalid_config_never_registers(self):
        from unittest.mock import patch

        for origin in (
            "http://campus.example",
            "https://campus.example/",
            "https://user:pass@campus.example",
            "https://campus.example?",
            "https://campus.example/path",
        ):
            with self.assertRaises(ValueError):
                TimetableTools(origin, 1)
        ctx = Mock()
        with patch.dict(
            "os.environ",
            {"CAMPUS_TIMETABLE_ORIGIN": "", "CAMPUS_TIMETABLE_OWNER_ID": "1"},
        ):
            register(ctx)
        ctx.register_tool.assert_not_called()


if __name__ == "__main__":
    unittest.main()
