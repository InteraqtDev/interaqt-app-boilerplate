import Navigo, { Match} from 'navigo'
import {Component, atom, createElement, Props, Atom, computed} from "axii";

type RouterPath = {
    [k: string]: Component
}

type RouterConfig = {
    defaultPath: string,
    matchAtoms: {
        [k: string]: (match: Match) => [any, any]
    }
}

export class Router {
    public ActiveComponent = atom(null)
    activeMatch = atom(null)
    activePath = atom(null)
    router: Navigo
    constructor(public pathToComponents: RouterPath, public config?:RouterConfig ) {
        this.router = new Navigo('/')
        Object.entries(pathToComponents).forEach(([path, Component]) => {
            this.router.on({
                [path]: {
                    as: path,
                    uses: (match: Match) => {
                        this.activePath(path)
                        this.activeMatch(match)
                    }
                }
            })
        })

        if (config?.defaultPath) {
            this.router.notFound(() => {
                this.router.navigate(config!.defaultPath)
            })
                // Promise.resolve().then(() => {
                //     if (!this.router.lastResolved()) {
                //         this.router.navigate(config!.defaultPath)
                //     }
                // })

        }

        this.router.resolve()
    }
    genGoto(path: string, params = {}) {
        const link = this.router.generate(path, params)
        return () => {
            this.router.navigate(link)
        }
    }
    genLink(path: string, params = {}) {
        return this.router.generate(path, params)
    }
    genAtoms(path:string, atomName:string) {

        const atomHandle = this.config?.matchAtoms[atomName]
        return computed(() => {
            const [activeReturn, inactiveReturn] = atomHandle!(this.activeMatch())
            return this.activePath() === path ? activeReturn : inactiveReturn
        })

    }
    render(createElement: (component: Component, data: Props) => any) {
        return () => {
            const ActiveComponent = this.pathToComponents[this.activePath()]

            console.log(this.activePath())

            if (!ActiveComponent) return null

            const {data} = this.activeMatch() || {}
            return createElement(ActiveComponent, data)
        }
    }

}
