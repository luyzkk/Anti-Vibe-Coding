import type { SrcTreeNode } from "../types";

/** Clean Architecture: domain/ + application/use-cases + infrastructure/ + presentation/ */
export const TREE_CLEAN_ARCH: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "domain",
      type: "dir",
      children: [
        {
          path: "aggregates",
          type: "dir",
          children: [{ path: "order.ts", type: "file" }],
        },
        {
          path: "value-objects",
          type: "dir",
          children: [{ path: "money.ts", type: "file" }],
        },
      ],
    },
    {
      path: "application",
      type: "dir",
      children: [
        {
          path: "use-cases",
          type: "dir",
          children: [{ path: "create-order.ts", type: "file" }],
        },
      ],
    },
    {
      path: "infrastructure",
      type: "dir",
      children: [
        {
          path: "repositories",
          type: "dir",
          children: [{ path: "order-repo.ts", type: "file" }],
        },
        {
          path: "adapters",
          type: "dir",
          children: [{ path: "payment-gateway.ts", type: "file" }],
        },
      ],
    },
    {
      path: "presentation",
      type: "dir",
      children: [
        {
          path: "controllers",
          type: "dir",
          children: [{ path: "order-controller.ts", type: "file" }],
        },
      ],
    },
  ],
};

/** Next.js App Router: app/...page.tsx + app/...route.ts + components/ + lib/ */
export const TREE_NEXTJS: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "app",
      type: "dir",
      children: [
        {
          path: "(dashboard)",
          type: "dir",
          children: [{ path: "page.tsx", type: "file" }],
        },
        { path: "layout.tsx", type: "file" },
        {
          path: "api",
          type: "dir",
          children: [
            {
              path: "health",
              type: "dir",
              children: [{ path: "route.ts", type: "file" }],
            },
          ],
        },
      ],
    },
    {
      path: "components",
      type: "dir",
      children: [{ path: "button.tsx", type: "file" }],
    },
    {
      path: "lib",
      type: "dir",
      children: [{ path: "utils.ts", type: "file" }],
    },
  ],
};

/** Vertical Slice: features/<name>/{domain,api,ui} + shared/lib/ */
export const TREE_VERTICAL_SLICE: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "features",
      type: "dir",
      children: [
        {
          path: "billing",
          type: "dir",
          children: [
            {
              path: "domain",
              type: "dir",
              children: [{ path: "invoice.ts", type: "file" }],
            },
            {
              path: "api",
              type: "dir",
              children: [{ path: "billing-router.ts", type: "file" }],
            },
            {
              path: "ui",
              type: "dir",
              children: [{ path: "invoice-list.tsx", type: "file" }],
            },
          ],
        },
        {
          path: "auth",
          type: "dir",
          children: [
            {
              path: "domain",
              type: "dir",
              children: [{ path: "user.ts", type: "file" }],
            },
          ],
        },
      ],
    },
    {
      path: "shared",
      type: "dir",
      children: [
        {
          path: "lib",
          type: "dir",
          children: [{ path: "date-utils.ts", type: "file" }],
        },
        {
          path: "ui",
          type: "dir",
          children: [{ path: "button.tsx", type: "file" }],
        },
      ],
    },
  ],
};

/** MVC Flat: controllers/ + models/ + views/ + services/ at the root */
export const TREE_MVC_FLAT: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "controllers",
      type: "dir",
      children: [{ path: "order-controller.ts", type: "file" }],
    },
    {
      path: "models",
      type: "dir",
      children: [{ path: "order.ts", type: "file" }],
    },
    {
      path: "views",
      type: "dir",
      children: [{ path: "order-view.ts", type: "file" }],
    },
    {
      path: "services",
      type: "dir",
      children: [{ path: "order-service.ts", type: "file" }],
    },
  ],
};

/** Unknown Mixed: random folders with no recognizable architecture pattern */
export const TREE_UNKNOWN: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "stuff",
      type: "dir",
      children: [{ path: "thing.ts", type: "file" }],
    },
    {
      path: "misc",
      type: "dir",
      children: [{ path: "other.ts", type: "file" }],
    },
    {
      path: "random",
      type: "dir",
      children: [{ path: "whatever.ts", type: "file" }],
    },
  ],
};

/**
 * Ambiguous: has both app/page.tsx + app/layout.tsx (Next.js = 60pts) AND features/<name>
 * (vertical-slice = 50pts). nextjs-app-router wins on score (60 > 50), validating G1 priority
 * (next.js preferred when both patterns present).
 *
 * Tiebreaker via PROFILE_PRIORITY activates when scores are equal — tested here via score
 * advantage, confirming nextjs always beats vertical-slice in mixed-signal scenarios.
 */
export const TREE_AMBIGUOUS_NEXTJS_AND_FEATURES: SrcTreeNode = {
  path: "src",
  type: "dir",
  children: [
    {
      path: "app",
      type: "dir",
      children: [
        { path: "page.tsx", type: "file" },
        { path: "layout.tsx", type: "file" },
      ],
    },
    {
      path: "features",
      type: "dir",
      children: [
        {
          path: "dashboard",
          type: "dir",
          children: [{ path: "index.ts", type: "file" }],
        },
      ],
    },
  ],
};
