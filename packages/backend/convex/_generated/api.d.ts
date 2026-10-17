/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as casos from "../casos.js";
import type * as ficha from "../ficha.js";
import type * as healthCheck from "../healthCheck.js";
import type * as historias from "../historias.js";
import type * as http from "../http.js";
import type * as procesarVisita from "../procesarVisita.js";
import type * as roles from "../roles.js";
import type * as urgencia from "../urgencia.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  casos: typeof casos;
  ficha: typeof ficha;
  healthCheck: typeof healthCheck;
  historias: typeof historias;
  http: typeof http;
  procesarVisita: typeof procesarVisita;
  roles: typeof roles;
  urgencia: typeof urgencia;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
