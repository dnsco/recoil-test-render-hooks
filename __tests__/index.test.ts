import { useEffect } from 'react'
import { atom, AtomEffect, MutableSnapshot, useRecoilState, useRecoilValue } from 'recoil'
import { act, recoilHookRenderContext } from '~index'

describe('recoilHookRenderContext', () => {
  const BASIC_ATOM = atom<string>({ key: 'testStringAtrom', default: 'DEFAULT' })

  it('gives us a context that holds the same recoil state to get hook values', async () => {
    const { getCurrentValue } = recoilHookRenderContext()
    const result = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
    expect(result[0]).toEqual('DEFAULT')

    act(() => result[1]('New Friends'))
    const [newValue] = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
    expect(newValue).toEqual('New Friends')
  })

  it('sets the initial state if provided', async () => {
    const initializeState = (snapshot: MutableSnapshot): void => {
      snapshot.set(BASIC_ATOM, 'PARTYTIME')
    }
    const { getCurrentValue } = recoilHookRenderContext(initializeState)
    const [val, set] = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
    expect(val).toEqual('PARTYTIME')

    //Assert having an initial state doesn't blow away resets
    act(() => set('HAPPY NEW NOW'))
    const [newVal] = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
    expect(newVal).toEqual('HAPPY NEW NOW')
  })

  describe('for atoms with immediate async effects', () => {
    const asyncEffect: AtomEffect<string> = ({ setSelf }) => {
      setTimeout(() => setSelf('POST ASYNC SET DEFAULT'), 0)
    }

    const ASYNC_EFFECT_ATOM = atom<string>({
      key: 'testAsyncEffectAtom',
      default: 'DEFAULT',
      effects_UNSTABLE: [asyncEffect],
    })

    it('Waits for async effects to run', async () => {
      const { getCurrentValue } = recoilHookRenderContext()
      const val = await getCurrentValue(() => useRecoilValue(ASYNC_EFFECT_ATOM))
      expect(val).toEqual('POST ASYNC SET DEFAULT')
    })
  })

  describe('for atoms with delayed async effects', () => {
    const delayedEffect: AtomEffect<string> = ({ setSelf }) => {
      setTimeout(() => setSelf('POST ASYNC SET DEFAULT'), 10)
    }

    const DELAYED_ASYNC_EFFECT = atom<string>({
      key: 'testDelayedEffectAtom',
      default: 'DEFAULT',
      effects_UNSTABLE: [delayedEffect],
    })

    it('allows delayed state mutation', async () => {
      const { getCurrentValue } = recoilHookRenderContext()
      let val: string | undefined

      await act(async () => {
        val = await getCurrentValue(() => useRecoilValue(DELAYED_ASYNC_EFFECT))
      })
      expect(val).toEqual('DEFAULT')

      await act(async () => {
        await new Promise((r) => setTimeout(r, 11))
        val = await getCurrentValue(() => useRecoilValue(DELAYED_ASYNC_EFFECT))
      })
      expect(val).toEqual('POST ASYNC SET DEFAULT')
    })

    describe('for custom hooks that use react effects', () => {
      const useRecoilCustomHooks = () => {
        const [value, set] = useRecoilState(BASIC_ATOM)
        useEffect(() => {
          setTimeout(() => set('NEW VAL SET BY HOOK EFFECT'), 3)
        }, [set])

        return value
      }

      it('allows you to use effects', async () => {
        const { getCurrentValue } = recoilHookRenderContext()
        let val: string | undefined
        await act(async () => {
          val = await getCurrentValue(useRecoilCustomHooks)
          expect(val).toEqual('DEFAULT')
          await new Promise((r) => setTimeout(r, 5))
        })
        val = await getCurrentValue(useRecoilCustomHooks)
        expect(val).toEqual('NEW VAL SET BY HOOK EFFECT')
      })

      it('accepts a configurable timeout to await async effects', async () => {
        const { getCurrentValue } = recoilHookRenderContext()

        const val = await getCurrentValue(useRecoilCustomHooks, { sleepFor: 8 })
        expect(val).toEqual('NEW VAL SET BY HOOK EFFECT')
      })
    })
  })
})
