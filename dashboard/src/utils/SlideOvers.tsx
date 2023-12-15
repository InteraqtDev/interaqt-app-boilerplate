import {InjectHandles, atom} from "axii";
import CloseIcon from '../icons/Close.js'

export function SlideOvers({ title = atom(''), children = null, visible = atom<boolean>(true)}, { createElement }: InjectHandles) {

    const panelClass = () => visible() ?
        `pointer-events-auto w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700 translate-x-0` :
        `pointer-events-auto w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700 translate-x-full`

    const containerClass = () => visible() ?
        "relative z-10":
        "relative z-10 hidden"

    return (
        <div class={containerClass} aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div class="fixed inset-0 overflow-hidden" onClick={() => visible(false)}>
                <div class="absolute inset-0 overflow-hidden">
                    <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">

                        <div class={panelClass} onClick={(e: MouseEvent) => e.stopPropagation()}>
                            <div class="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                                <div class="px-4 sm:px-6">
                                    <div class="flex items-start justify-between">
                                        <h2 class="text-base font-semibold leading-6 text-xl text-gray-900" id="slide-over-title">{title}</h2>
                                        <div class="ml-3 flex h-7 items-center">
                                            <button onclick= {() => visible(false)} type="button" class="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                                <span class="absolute -inset-2.5"></span>
                                                <span class="sr-only">Close panel</span>
                                                <CloseIcon/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="relative mt-6 flex-1 px-4 sm:px-6">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

