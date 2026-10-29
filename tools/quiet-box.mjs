#!/usr/bin/env node
// Is the box quiet enough for a long test run? Reads it; starts nothing.
import { runQuietBoxCommand } from './quiet-box-lib.mjs';

process.exitCode = await runQuietBoxCommand();
