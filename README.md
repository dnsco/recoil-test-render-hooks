# recoil-test-render-hooks

## Basic Usage

```typescript
const BASIC_ATOM = atom<string>({key: 'testStringAtrom', default: 'DEFAULT'})
const {getCurrentValue} = recoilHookRenderContext()
const [value, setValue] = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
expect(value).toEqual('DEFAULT')

act(() => setValue('New Friends'))
const [newValue] = await getCurrentValue(() => useRecoilState(BASIC_ATOM))
expect(newValue).toEqual('New Friends')
```

## Motivatation

Testing data isolated from views is preferable to testing in integration for non-trivial cases. Testing at the hook
level allows you to assert expectations around the data through the interface it will be consumed in the component
and preserves the knowledge encoded in the type system (if one is used on the project).
Providing a mutable context for our data allows us to set up testing scenarios that mimic actual usage.

### Async Effects
Asynchronous effect logic can be complicated, yet getting it right is crucial to produce working systems.
This library's approach allows us to test this logic independent of the implementation.

```typescript
describe('Atoms with async effects in effects_UNSTABLE', () => {
    const asyncEffect: AtomEffect<string> = ({setSelf}) => {
        setTimeout(() => setSelf('POST ASYNC SET DEFAULT'), 0)
    }

    const ASYNC_EFFECT_ATOM = atom<string>({
        key: 'testAsyncEffectAtom',
        default: 'DEFAULT',
        effects_UNSTABLE: [asyncEffect],
    })

    it('Waits for async effects to run', async () => {
        const {getCurrentValue} = recoilHookRenderContext()
        const val = await getCurrentValue(() => useRecoilValue(ASYNC_EFFECT_ATOM))
        expect(val).toEqual('POST ASYNC SET DEFAULT')
    })
})
```


If the logic becomes to unwieldy for the ```effects_UNSTABLE``` interface, the logic can be seamlessly moved to a custom
react hook:

```typescript
describe('Testing custom recoil hoooks', () => {
    const useChangesValueAfter5MS = () => {
        const [value, set] = useRecoilState(BASIC_ATOM)
        useEffect(() => {
            setTimeout(() => set('NEW VAL SET BY HOOK EFFECT'), 5)
        }, [set])

        return value
    }
    
    it('accepts a configurable timeout to await async effects', async () => {
        const {getCurrentValue} = recoilHookRenderContext()
        const val = await getCurrentValue(useChangesValueAfter5MS, {sleepFor: 10})
        expect(val).toEqual('NEW VAL SET BY HOOK EFFECT')
    })
})
```


If you want to test multiple stages of an asynchronous process, this is also possible.
Just be sure to wrap actions that will mutate the state in an ```act()```.

```typescript
it('allows you to test async effects at any point of the process.', async () => {
    const {getCurrentValue} = recoilHookRenderContext()
    
    await act(async () => {
        const valBefore = await getCurrentValue(useAsyncEffectCustomHook)
        expect(valBefore).toEqual('DEFAULT')
        await new Promise((resolve) => setTimeout(resolve, 10))
    })
    
    const valAfter = await getCurrentValue(useAsyncEffectCustomHook)
    expect(valAfter).toEqual('NEW VAL SET BY HOOK EFFECT')
})
```

### Other Approaches

The two testing styles suggested in the [Recoil Testing Guide](https://recoiljs.org/docs/guides/testing/)
both have their own drawbacks:

- #### Testing state integrated with views

Integration loses the structure of the data. If you are using a type system, this effect is compounded as you are forced
to use "stringly-typed" strategy, losing the benefit of your typing-efforts. Creating and rendering custom components in
tests is cumbersome, but necessary when testing asynchronous effects.

- #### Snapshot testing

Snapshot testing allows you to test the data isolated from the views. However, at this point in time testing
asynchronous effects on atoms or hooks is not possible with this strategy.
