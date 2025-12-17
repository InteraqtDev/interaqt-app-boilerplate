import {Database, DatabaseLogger, EntityIdRef, ROW_ID_ATTR, asyncInteractionContext, InteractionContext, dbConsoleLogger} from "interaqt";
import pg, { type ClientConfig} from 'pg'
import { uuidv7 } from "@interaqt/uuidv7";

const { Client} = pg

class IDSystem {
    constructor(public db: Database) {}
    setup() {
        // No setup needed for UUID-based IDs
        return Promise.resolve()
    }
    async getAutoId(recordName: string) {
        // Use UUID for consistent string IDs across all database types
        return uuidv7()
    }
}

export type PostgreSQLDBConfig = Omit<ClientConfig, 'database'> & { logger? :DatabaseLogger }

export class PostgreSQLDB implements Database{
    idSystem!: IDSystem
    logger: DatabaseLogger
    db: InstanceType<typeof Client>
    constructor(public database:string, public options: PostgreSQLDBConfig = {}) {
        this.idSystem = new IDSystem(this)
        this.logger = this.options?.logger || dbConsoleLogger
        // First connect to 'postgres' database to check/create target database
        this.db = new Client({
            ...options,
            database: 'postgres'  // Connect to default postgres database first
        })
    }
    async open(forceDrop = false) {
        // Connect to postgres database first
        await this.db.connect()
        
        // Check if target database exists
        const databaseExist = await this.db.query(`SELECT FROM pg_database WHERE datname = '${this.database}'`)
        
        if (databaseExist.rows.length === 0) {
            console.log(`Creating database: ${this.database}`)
            await this.db.query(`CREATE DATABASE ${this.database}`)
        } else if (forceDrop) {
            console.log(`Recreating database: ${this.database}`)
            await this.db.query(`DROP DATABASE ${this.database}`)
            await this.db.query(`CREATE DATABASE ${this.database}`)
        }
        
        // Close connection to postgres database
        await this.db.end()
        
        // Now connect to target database
        this.db = new Client({
            ...this.options,
            database: this.database
        })
        await this.db.connect()
        console.log(`Connected to database: ${this.database}`)

        await this.idSystem.setup()
    }
    async query<T extends any>(sql:string, where: any[] =[], name= '')  {
        const context= asyncInteractionContext.getStore() as InteractionContext
        const logger = this.logger.child(context?.logContext || {})

        const params = where.map(x => x===false ? 0 : x===true ? 1 : x)
        logger.info({
            type:'query',
            name,
            sql,
            params
        })
        try {
            return (await this.db.query(sql, params)).rows as T[]
        } catch (error: any) {
            logger.error({
                type:'query',
                name,
                sql,
                params,
                error: error.message
            })
            throw error
        }
    }
    async update<T extends any>(sql:string,values: any[], idField?:string, name='') {
        const context= asyncInteractionContext.getStore() as InteractionContext
        const logger = this.logger.child(context?.logContext || {})
        const finalSQL = `${sql} ${idField ? `RETURNING "${idField}" AS id`: ''}`
        const params = values.map(x => {
            return (typeof x === 'object' && x !==null) ? JSON.stringify(x) : x===false ? 0 : x===true ? 1 : x
        })
        logger.info({
            type:'update',
            name,
            sql:finalSQL,
            params
        })
        return  (await this.db.query(sql, params)).rows as T[]
    }
    async insert(sql:string, values:any[], name='')  {
        const context= asyncInteractionContext.getStore() as InteractionContext
        const logger = this.logger.child(context?.logContext || {})
        const params = values.map(x => {
            return (typeof x === 'object' && x !==null) ? JSON.stringify(x) : x===false ? 0 : x===true ? 1 : x
        })
        logger.info({
            type:'insert',
            name,
            sql,
            params
        })

        const finalSQL = `${sql} RETURNING "${ROW_ID_ATTR}"`
        try {
            return (await this.db.query(finalSQL, params)).rows[0] as EntityIdRef
        } catch (error: any) {
            logger.error({
                type:'insert',
                name,
                sql: finalSQL,
                params,
                error: error.message
            })
            throw error
        }
    }
    async delete<T extends any> (sql:string, where: any[], name='') {
        const context= asyncInteractionContext.getStore() as InteractionContext
        const logger = this.logger.child(context?.logContext || {})
        const params = where.map(x => x===false ? 0 : x===true ? 1 : x)
        logger.info({
            type:'delete',
            name,
            sql,
            params
        })
        return  (await this.db.query(sql, params)).rows as T[]
    }
    async scheme(sql: string, name='') {
        const context= asyncInteractionContext.getStore() as InteractionContext
        const logger = this.logger.child(context?.logContext || {})
        logger.info({
            type:'scheme',
            name,
            sql,
        })
        try {
            return await this.db.query(sql)
        } catch (error: any) {
            logger.error({
                type:'scheme',
                name,
                sql,
                error: error.message
            })
            throw error
        }
    }
    close() {
        return this.db.end()
    }
    async getAutoId(recordName: string) {
        return this.idSystem.getAutoId(recordName)
    }
    parseMatchExpression(key: string, value:[string, string], fieldName: string, fieldType: string, isReferenceValue: boolean, getReferenceFieldValue: (v: string) => string, p: () => string) {
        if (fieldType.toLowerCase() === 'json') {
            if (value[0].toLowerCase() === 'contains') {
                const fieldNameWithQuotes = fieldName.split('.').map(x => `"${x}"`).join('.')
                return {
                    fieldValue: `IS NOT NULL AND ${p()} = ANY (SELECT json_array_elements_text(${fieldNameWithQuotes}))`,
                    fieldParams: [value[1]]
                }
            }
        }
    }

    getPlaceholder() {
        let index = 0
        return () => {
            index++
            return `$${index}`
        }
    }
    mapToDBFieldType(type: string, collection?: boolean) {
        if (type === 'pk') {
            return 'SERIAL PRIMARY KEY'  // Auto-increment internal row ID
        } else if (type === 'id') {
            return 'UUID'  // UUID string for entity IDs and foreign key references
        } else if (collection || type === 'object') {
            return 'JSON'
        } else if (type === 'string') {
            return 'TEXT'
        } else if (type === 'boolean') {
            return 'BOOLEAN'
        } else if(type === 'number'){
            return "INT"
        }else if(type === 'timestamp'){
            return "TIMESTAMP"
        }else{
            return type
        }
    }
}