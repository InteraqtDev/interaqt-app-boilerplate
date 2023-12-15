import {Attributive, Attributives, BoolAtomData, BoolExpressionData, KlassInstance} from "@interaqt/shared";
import {RecordAttribute, RecordMapItem, ValueAttribute} from "@interaqt/storage";

export type ExpOrAtom = KlassInstance<typeof BoolExpressionData, false> | KlassInstance<typeof BoolAtomData, false>

function renderAttributiveRecursive(expOrAtom?: ExpOrAtom): string {
    if (!expOrAtom) return ''

    const asAtom = expOrAtom as KlassInstance<typeof BoolAtomData, false>
    const asExp = expOrAtom as KlassInstance<typeof BoolExpressionData, false>
    if (asAtom.type === 'atom') {
        return (asAtom.data as KlassInstance<typeof Attributive, false>).name!
    } else {

        if (asExp.operator === 'and') {
            const left = asExp.left.type === 'or' ? `(${renderAttributiveRecursive(asExp.left!)})` : renderAttributiveRecursive(asExp.left!)
            const right = asExp.left.type === 'or' ? `(${renderAttributiveRecursive(asExp.right!)})` : renderAttributiveRecursive(asExp.right!)
            return `${left} && ${right}`
        } else if (asExp.operator === 'or') {
            return `${renderAttributiveRecursive(asExp.left as ExpOrAtom)}} || ${renderAttributiveRecursive(asExp.right!)}`
        } else if (asExp.operator === 'not') {
            // not
            return asExp.left.type === 'atom' ? renderAttributiveRecursive(asExp.left as ExpOrAtom) : `(${renderAttributiveRecursive(asExp.left!)})`
        } else {
            throw new Error(`unknown type ${asExp.type}`)
        }
    }
}

export function renderAttributives(attributives?: KlassInstance<typeof Attributives, false> | KlassInstance<typeof Attributive, false>) {
    if (!attributives) return ''
    if (Attributive.is(attributives)) return (attributives as KlassInstance<typeof Attributive, false>).content.name

    return renderAttributiveRecursive((attributives as KlassInstance<typeof Attributives, false>).content)

}



function getExampleItemValue(v: ValueAttribute) {
    // 注意  id 是 id 类型，所以这里也会返回 undefined，这样在 json 中就被过滤了
    return v.type === 'string' ? "" :
        v.type === 'number' ? 1 :
            v.type === 'boolean' ? false :
                v.type === 'object' ? {} :
                    undefined
}

export function getExampleValueForRecord(item: RecordMapItem) {
    const selfAttributes = Object.entries(item.attributes).filter(([k, v]) => {
        return !(v as RecordAttribute).isRecord
    })

    const result: any = {}
    for (let [k, v] of selfAttributes) {
        result[k] = getExampleItemValue(v as ValueAttribute)
    }
    return result
}