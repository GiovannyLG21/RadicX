import { BrowserContext, Page } from "playwright";
import NuevaEpsBot from "../EPS/NuevaEPS";

/**
 * @class Workflow para el manejo de facturas de Horisoes y NuevaEPS 
 */
export class HorisoesNuevaEpsWorkflow {
    private EPSBot: NuevaEpsBot

    constructor(
        private context: BrowserContext,
        private page: Page
    ) { 
        this.EPSBot = new NuevaEpsBot(this.context, this.page)
    }

    async run() {
        // await this.EPSBot.careHisLogin()
        await this.EPSBot.nuevaEpsLogin()
    }
}