import * as React from 'react'
import {
  MutableSnapshot,
  RecoilRoot,
  useRecoilBridgeAcrossReactRoots_UNSTABLE as useRecoilBridge,
} from 'recoil'
import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks'

interface RecoilHookRenderer {
  renderRecoil<R>(hook: () => R): Promise<RenderHookResult<undefined, R>>
  getCurrentValue<R>(hook: () => R): Promise<R>
}

export function recoilHookRenderContext(initializeState?: (s: MutableSnapshot) => void): RecoilHookRenderer {
  const { result: renderedBridge } = renderHook(useRecoilBridge, {
    wrapper: ({ children }) => <RecoilRoot initializeState={initializeState}>{children}</RecoilRoot>,
  })

  return bridgedHookRenderer(renderedBridge.current)
}

function bridgedHookRenderer(Bridge: React.FC) {
  async function renderRecoil<R>(hook: () => R): Promise<RenderHookResult<undefined, R>> {
    let rendered: RenderHookResult<undefined, R> | undefined

    // await async act in case there are any async effects on the hook
    await act(async () => {
      rendered = renderHook(hook, { wrapper: Bridge })
      await new Promise((r) => setImmediate(r))
    })

    if (!rendered) throw new Error('Did not set hook result')

    return rendered
  }

  async function getCurrentValue<R>(hook: () => R): Promise<R> {
    const { result } = await renderRecoil(hook)
    return result.current
  }

  return { renderRecoil, getCurrentValue }
}
