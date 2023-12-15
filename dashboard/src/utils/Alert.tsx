import {InjectHandles, atom, reactive, computed} from "axii";


export function Alert({type = 'info', children}: {type?: 'info' | 'success' | 'warning' | 'error', children: any}, {createElement}: InjectHandles) {
    const containerClass = type === 'info' ? 'bg-blue-50' : type === 'success' ? 'bg-green-50' : type === 'warning' ? 'bg-yellow-50' : 'bg-red-50'
    return (
        <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
                <div class="ml-3">
                    {children}
                </div>
            </div>
        </div>
    )
}