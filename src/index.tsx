import * as React from 'react'
import {
  MutableSnapshot,
  RecoilRoot,
  useRecoilBridgeAcrossReactRoots_UNSTABLE as useRecoilBridge,
} from 'recoil'
import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks'

interface HookRenderOptions {
  timeout?: number
}
interface RecoilHookRenderer {
  renderRecoil<R>(
    this: void,
    hook: () => R,
    opts?: HookRenderOptions
  ): Promise<RenderHookResult<undefined, R>>
  getCurrentValue<R>(this: void, hook: () => R, opts?: HookRenderOptions): Promise<R>
}

function recoilHookRenderContext(initializeState?: (s: MutableSnapshot) => void): RecoilHookRenderer {
  const { result: renderedBridge } = renderHook(useRecoilBridge, {
    wrapper: ({ children }) => <RecoilRoot initializeState={initializeState}>{children}</RecoilRoot>,
  })

  const Bridge = renderedBridge.current
  return bridgedHookRenderer(Bridge)
}

function bridgedHookRenderer(Bridge: React.FC) {
  async function renderRecoil<R>(
    this: void,
    hook: () => R,
    opts?: HookRenderOptions
  ): Promise<RenderHookResult<undefined, R>> {
    const { timeout = 0 } = opts ?? {}

    let rendered: RenderHookResult<undefined, R> | undefined

    await act(async () => {
      rendered = renderHook(hook, { wrapper: Bridge })
      await new Promise((r) => setTimeout(r, timeout))
    })

    if (!rendered) throw new Error('Did not set hook result')

    if (rendered.result.error) throw rendered.result.error
    return rendered
  }

  async function getCurrentValue<R>(this: void, hook: () => R, opts?: HookRenderOptions): Promise<R> {
    const { result } = await renderRecoil(hook, opts)
    return result.current
  }

  return { renderRecoil, getCurrentValue }
}

export { act, recoilHookRenderContext }
