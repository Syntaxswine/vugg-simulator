#!/usr/bin/env node
// Local full-guard verdict; --check reads the stamp without starting CI.
import { runColdCiCommand } from './cold-ci-lib.mjs';

process.exitCode = await runColdCiCommand();
