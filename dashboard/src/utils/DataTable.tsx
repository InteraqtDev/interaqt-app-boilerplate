import {InjectHandles, atom} from "axii";

type Columns = {
    name: string,
    index: string,
} []

type DataTableProp = {
    columns: Columns,
    data: any[]
}


function getByIndexPath(root: any, indexPath: string) {
    const path = indexPath.split('.')
    const last = path.pop()
    while(path.length) {
        // @ts-ignore
        root = root[path.shift()]
    }
    return root[`$${last}`]
}


export function DataTable({ columns =[], data = [] }: DataTableProp, {createElement}: InjectHandles) {
    return (
        <div class="inline-block min-w-full  align-middle  ring-gray-200 ring-1 rounded">
            <table class="min-w-full divide-y divide-gray-300">
                <thead>
                <tr class="divide-x divide-gray-200">
                    {() => columns.map(column => (
                        <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-gray-900">{column.name}</th>
                    ))}
                </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                {() => data.map(oneLine => (
                    <tr class="divide-x divide-gray-200">
                        {() => columns.map(column => (
                            <td class="whitespace-nowrap p-4 text-sm text-gray-500">{() => getByIndexPath(oneLine, column.index)}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
