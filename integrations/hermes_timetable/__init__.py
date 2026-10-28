"""Optional native Hermes adapter for the versioned public timetable API."""

from __future__ import annotations

import contextvars
import copy
import datetime as dt
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

MAX_RESPONSE = 1024 * 1024


def owner_origin(owner: int) -> bool:
    """Task-bound SDK context only; never use routing values from os.environ."""
    bound = {key.name: value for key, value in contextvars.copy_context().items()}
    if (
        owner <= 0
        or bound.get("HERMES_SESSION_PLATFORM") != "telegram"
        or bound.get("HERMES_SESSION_CHAT_TYPE") != "dm"
        or bound.get("HERMES_CRON_SESSION") != ""
    ):
        return False
    try:
        return (
            int(bound.get("HERMES_SESSION_USER_ID", "")) == owner
            and int(bound.get("HERMES_SESSION_CHAT_ID", "")) == owner
            and int(bound.get("HERMES_SESSION_MESSAGE_ID", "")) > 0
        )
    except (TypeError, ValueError):
        return False


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args: Any, **_kwargs: Any) -> None:
        return None


def schema(
    name: str, description: str, properties: dict[str, Any], required: str
) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                **properties,
                "mode": {
                    "type": "string",
                    "enum": ["cache", "load"],
                    "default": "cache",
                },
            },
            "required": [required]
            if name.endswith("groups")
            else ["group_id", required],
        },
    }


TOOLS = (
    schema(
        "omgtu_timetable_groups",
        "Find public timetable groups. Default cache never contacts the university. "
        "Use mode=load only for an explicit user timetable request. "
        "A cache miss is not empty data.",
        {"term": {"type": "string", "minLength": 2, "maxLength": 80}},
        "term",
    ),
    schema(
        "omgtu_timetable_week",
        "Read one public planned week (Monday, Asia/Omsk) with check time and snapshot ref. "
        "mode=cache for dry-run/analysis. mode=load permits one bounded cached source load. "
        "Not journal marks. DISPLAY_ONLY subgroups do not prove journal applicability; "
        "never import or bind them automatically. No writes.",
        {
            "group_id": {"type": "integer", "minimum": 1, "maximum": 10000000},
            "week": {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"},
        },
        "week",
    ),
)


class TimetableTools:
    def __init__(self, origin: str, owner: int) -> None:
        parsed = urllib.parse.urlsplit(origin)
        if (
            owner <= 0
            or parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.netloc != parsed.hostname
            or origin != "https://" + parsed.hostname
            or re.fullmatch(r"[a-z0-9.-]+", parsed.hostname) is None
        ):
            raise ValueError("invalid_timetable_origin")
        self.origin, self.owner = origin, owner
        self.opener = urllib.request.build_opener(NoRedirect())

    def handle(self, name: str, args: dict[str, Any]) -> str:
        if not owner_origin(self.owner):
            return json.dumps({"code": "OWNER_PRIVATE_TELEGRAM_REQUIRED"})
        if (
            not isinstance(args, dict)
            or not isinstance(args.get("mode", "cache"), str)
            or args.get("mode", "cache") not in {"cache", "load"}
        ):
            return json.dumps({"code": "INVALID_ARGUMENTS"})
        query = {"mode": args.get("mode", "cache")}
        if name == "omgtu_timetable_groups":
            term = args.get("term")
            if (
                set(args) - {"term", "mode"}
                or not isinstance(term, str)
                or not 2 <= len(term) <= 80
                or term.strip() != term
            ):
                return json.dumps({"code": "INVALID_ARGUMENTS"})
            path, query["term"] = "groups", term
        elif name == "omgtu_timetable_week":
            group, week = args.get("group_id"), args.get("week")
            if (
                set(args) - {"group_id", "week", "mode"}
                or type(group) is not int
                or not 1 <= group <= 10000000
                or not isinstance(week, str)
            ):
                return json.dumps({"code": "INVALID_ARGUMENTS"})
            try:
                day = dt.date.fromisoformat(week)
                if day.isoformat() != week or day.weekday() != 0:
                    raise ValueError
            except ValueError:
                return json.dumps({"code": "INVALID_ARGUMENTS"})
            path, query["week"] = f"weeks/{group}", week
        else:
            return json.dumps({"code": "INVALID_ARGUMENTS"})
        request = urllib.request.Request(  # noqa: S310 -- fixed validated HTTPS origin, no redirects
            self.origin
            + "/api/v1/timetable/"
            + path
            + "?"
            + urllib.parse.urlencode(query),
            headers={"Accept": "application/json"},
            method="GET",
        )
        try:
            # Fixed configured origin, no model URL, credentials, redirects or retries.
            with self.opener.open(request, timeout=8) as response:
                raw = response.read(MAX_RESPONSE + 1)
                if (
                    response.status != 200
                    or len(raw) > MAX_RESPONSE
                    or response.headers.get_content_type() != "application/json"
                ):
                    raise ValueError
                result = json.loads(raw)
                if (
                    not isinstance(result, dict)
                    or result.get("source") != "RUZ_PLANNED"
                    or result.get("state") not in {"READY", "NOT_CACHED"}
                    or result.get("mode") != query["mode"]
                    or result.get("membership") != "DISPLAY_ONLY"
                ):
                    raise ValueError
            return json.dumps({"code": "OK", "result": result}, ensure_ascii=False)
        except urllib.error.HTTPError as error:
            error.close()
            return json.dumps({"code": "TIMETABLE_UNAVAILABLE"})
        except (OSError, ValueError, urllib.error.URLError):
            return json.dumps({"code": "TIMETABLE_UNAVAILABLE"})


def register(ctx: Any) -> None:
    """A separate plugin: attendance's four-tool contract remains unchanged."""
    try:
        tools = TimetableTools(
            os.environ.get("CAMPUS_TIMETABLE_ORIGIN", ""),
            int(os.environ.get("CAMPUS_TIMETABLE_OWNER_ID", "0")),
        )
    except ValueError:
        return
    for definition in TOOLS:
        name = definition["name"]

        def handler(args: dict[str, Any], _name: str = name, **_kwargs: Any) -> str:
            return tools.handle(_name, args)

        ctx.register_tool(
            name=name,
            toolset="omgtu_timetable",
            schema=copy.deepcopy(definition),
            handler=handler,
            requires_env=["CAMPUS_TIMETABLE_ORIGIN", "CAMPUS_TIMETABLE_OWNER_ID"],
        )
