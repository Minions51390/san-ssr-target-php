# san-ssr-target-php
[![npm version](https://img.shields.io/npm/v/san-ssr-target-php.svg)](https://www.npmjs.org/package/san-ssr-target-php)
[![downloads](https://img.shields.io/npm/dm/san-ssr-target-php.svg)](https://www.npmjs.org/package/san-ssr-target-php)
[![Build Status](https://travis-ci.com/searchfe/san-ssr-target-php.svg?branch=master)](https://travis-ci.com/searchfe/san-ssr-target-php)
[![Coveralls](https://img.shields.io/coveralls/searchfe/san-ssr-target-php.svg)](https://coveralls.io/github/searchfe/san-ssr-target-php?branch=master)
[![dependencies](https://img.shields.io/david/searchfe/san-ssr-target-php.svg)](https://david-dm.org/searchfe/san-ssr-target-php)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/searchfe/san-ssr-target-php)
[![GitHub issues](https://img.shields.io/github/issues-closed/searchfe/san-ssr-target-php.svg)](https://github.com/searchfe/san-ssr-target-php/issues)
[![David](https://img.shields.io/david/searchfe/san-ssr-target-php.svg)](https://david-dm.org/searchfe/san-ssr-target-php)
[![David Dev](https://img.shields.io/david/dev/searchfe/san-ssr-target-php.svg)](https://david-dm.org/searchfe/san-ssr-target-php?type=dev)
[![DUB license](https://img.shields.io/dub/l/vibe-d.svg)](https://github.com/searchfe/san-ssr-target-php/blob/master/LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits)

## Install

Supported Environment

* PHP 5 >= 5.3.0, PHP 7

```bash
npm i san san-ssr san-ssr-target-php
```

Note: ts2php requires a specific external TypeScript, you'll need `npm i typescript@3.4`, see [searchfe/ts2php/issues/93](https://github.com/searchfe/ts2php/issues/93).

## CLI Usage

Command line interface:

```bash
san-ssr --target php --compile '{"nsPrefix":"demo\\"}' ./component.ts > ssr.php
```

## Programmatic Interface

Pass `'php'` as the second parameter of SanProject
[SanProject#compile(filepath, target, options)][.compile()] method.

TypeScript:

```typescript
import { Target, SanProject } from 'san-project'
import { writeFileSync } from 'fs'

const project = new SanProject()
const targetCode = project.compile('src/component.ts', 'php')

writeFileSync('ssr.php', targetCode)
```

Or in JavaScript:

```typescript
const { SanProject } = require('san-project')
import { writeFileSync } from 'fs'

const project = new SanProject()
const targetCode = project.compile('src/component.ts', 'php')

writeFileSync('ssr.php', targetCode)
```

## Known Issues

THIS SECTION IS FOR MAINTAINERS ONLY

- noDataOutput 控制的数据输出中，对象序列化使用 json_encode 实现，属性顺序和 JavaScript 中可能不同

## Contribution Guide

Development Prerequisites:

* Node.js>=8
* PHP 7
* [composer](https://getcomposer.org)

Install dependencies and run tests:

```bash
npm install
composer install
npm test
```

Debug a single case (e.g. `test/cases/array-literal`):

```bash
./bin/debug array-literal
```

`source ./bin/auto-complete` to make zsh to auto complete test case names.

[san]: https://github.com/baidu/san
[sanproject]: https://searchfe.github.io/san-ssr-target-php/classes/_models_san_project_.sanproject.html
[compile]: https://searchfe.github.io/san-ssr-target-php/classes/_models_san_project_.sanproject.html#compile