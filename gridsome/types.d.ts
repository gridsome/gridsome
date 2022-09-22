import type Vue from 'vue'
import type VueRouter from 'vue-router'
import type { Route } from 'vue-router'
import type { MetaInfo } from 'vue-meta'

export type PageQueryResult = Record<string, any>
export type StaticQueryResult = Record<string, any>

declare module 'vue/types/vue' {
  interface Vue {
    $page?: PageQueryResult | null
    $static?: StaticQueryResult | null
  }
}

export type RouteData = { data: PageQueryResult }

export function fetch(path: string): Promise<RouteData>
export function url(path: string): string
export function useMetaInfo(metaInfo: MetaInfo | (() => MetaInfo)): void
export function useRouter(): VueRouter
export function useRoute(): Route
export function usePageQuery(): PageQueryResult | null
export function useStaticQuery(): StaticQueryResult | null

export { Vue }
