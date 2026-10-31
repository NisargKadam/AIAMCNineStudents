import "server-only";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getQuickJS } from "quickjs-emscripten";
import { isDeepStrictEqual } from "node:util";
import type { TestCase } from "./bank";

const nodeRequire = createRequire(`${process.cwd()}/package.json`);
let source: Promise<string> | undefined;

/** Python runs inside Skulpt inside a bounded QuickJS WASM context. No host
 * functions, module loader, filesystem, network, process, or credentials are
 * exposed to the guest. Never replace this with eval, node:vm, or a subprocess. */
export async function checkPython(
  code: string,
  functionName: string,
  test: TestCase,
) {
  const QuickJS = await getQuickJS();
  source ??= readFile(nodeRequire.resolve("skulpt/dist/skulpt.min.js"), "utf8");
  const bundle = await source;
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(64 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  const stop = Date.now() + 1200;
  runtime.setInterruptHandler(() => Date.now() >= stop);
  const context = runtime.newContext();
  try {
    const result = context.evalCode(`${bundle}\n;
      Sk.configure({__future__: Sk.python3, output: function(){},
        read: function(){ throw new Error("Imports are unavailable. Use Python built-ins only."); },
        execLimit: 700, yieldLimit: null});
      var mod = Sk.importMainWithBody("answer", false, ${JSON.stringify(code)}, false);
      var args = ${JSON.stringify(test.args)}.map(function(a){ return Sk.ffi.remapToPy(a); });
      var value = Sk.misceval.callsimArray(mod.$d[Sk.fixReserved(${JSON.stringify(functionName)})], args);
      JSON.stringify({value: Sk.ffi.remapToJs(value), args: args.map(function(a){return Sk.ffi.remapToJs(a);})});
    `);
    if (result.error) {
      result.error.dispose();
      return {
        passed: false,
        error:
          "Python could not finish. Check syntax, function name, built-in usage, and execution limits.",
      };
    }
    try {
      const raw = context.getString(result.value);
      const value = JSON.parse(raw);
      return {
        passed:
          isDeepStrictEqual(value.value, test.expected) &&
          isDeepStrictEqual(value.args, test.args),
        error: undefined,
      };
    } finally {
      result.value.dispose();
    }
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
