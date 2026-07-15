#!/bin/sh
export NODE_ENV=development
exec node_modules/.bin/tsx watch server/_core/index.ts
