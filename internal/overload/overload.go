// Package overload distinguishes local admission limits from source failures.
package overload

import "errors"

var ErrBusy = errors.New("schedule refresh queue is full")

const RetryAfterSeconds = 5
