import {InjectHandles, atom, reactive, computed} from "axii";
import {DataTable} from "./utils/DataTable.js";
import {post} from "./utils/post.js";
import { BoolExp} from "@interaqt/shared";
import {MapData, RecordAttribute} from "@interaqt/storage";
import {getExampleValueForRecord} from "./common.js";
import {Code} from "./utils/code/Code.js";


export default function RecordDataPanel({ record = atom(''), map = atom<MapData|null>(null)}, {createElement}: InjectHandles) {

    const columns = reactive([])
    const data = reactive([])
    const fetchTime = atom<string>(Date.now().toString())

    computed(() => {
        if (record() && map()?.records && fetchTime()){
            const currentRecord = map()?.records[record()]!
            const attributeNames = Object.keys(currentRecord!.attributes!)
            const selfAttributes = attributeNames.filter((name=> !((currentRecord.attributes![name] as RecordAttribute).isRecord) ))
            // @ts-ignore
            columns.splice(0, Infinity, ...selfAttributes.map(name => ({name, index: name})))

            const attributeQuery = currentRecord.isRelation ? ['*', ['source', {attributeQuery: ['*']}], ['target', {attributeQuery: ['*']}]] : ['*']

            if (currentRecord.isRelation) {
                const sourceRecord = map()?.records[(currentRecord.attributes!.source as RecordAttribute).recordName]!
                const targetRecord = map()?.records[(currentRecord.attributes!.target as RecordAttribute).recordName]!
                const sourceSelfAttributes = Object.keys(sourceRecord!.attributes!).filter((name=> !((sourceRecord.attributes![name] as RecordAttribute).isRecord) ))
                const targetSelfAttributes = Object.keys(targetRecord!.attributes!).filter((name=> !((targetRecord.attributes![name] as RecordAttribute).isRecord) ))
                // @ts-ignore
                columns.push(...sourceSelfAttributes.map(name => ({name: `source.${name}`, index: `source.${name}`})))
                // @ts-ignore
                columns.push(...targetSelfAttributes.map(name => ({name: `target.${name}`, index: `target.${name}`})))
            }

            post('/api/getRecords', [record(), undefined, attributeQuery]).then((result: any[]) => {
                // @ts-ignore
                data.splice(0, Infinity, ...result)
            })
        }
    })



    const initialValue = getExampleValueForRecord(map()!.records[record()]!)

    const value = atom(JSON.stringify(initialValue, null, 2))
    const sending = atom<boolean>(false)
    const editorRef = atom<any>(null)

    const result = atom<any>(null)
    const error = atom<any>(null)
    const xUserId = atom(1)
    const onClickSend = async () => {
        sending(true)
        try {
            const newValue = editorRef()?.getValue()

            result(await post(`/api/createRecord`, [record(), JSON.parse(newValue)], xUserId().toString()))
        } catch (e) {
            error(e)
        }
        sending(false)
        fetchTime(Date.now().toString())
    }


    return <div>
        <DataTable columns={columns} data={data} />

        <div class="mt-6">
            <button disabled={sending} onClick={onClickSend} type="button" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:bg-indigo-500 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                {() => sending() ? 'Sending...' : 'Send'}
            </button>
        </div>

        <div class="w-full mt-6">
            <Code value={value} handle={editorRef} options={{language: 'json'}}/>
        </div>

        <div class="mt-6">
            {() => error() ? <div class="rounded-md bg-red-50 p-4 mb-6">An error occurred while sending the request, please check the console.</div> : null}
            <div class="relative">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                    <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-start">
                    <span class="bg-white pr-3 text-base font-semibold leading-6 text-gray-900">Projects</span>
                </div>
            </div>
            <div class="rounded-md bg-blue-50 p-4 mt-6">
                <pre>
                {() => JSON.stringify(result(), null, 2)}
            </pre>
            </div>
        </div>
    </div>
}