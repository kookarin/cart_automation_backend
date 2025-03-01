declare module '@scalar/express-api-reference' {
    import { RequestHandler } from 'express';
    
    interface ApiReferenceOptions {
        spec: {
            content: object;
        };
    }

    export function apiReference(options: ApiReferenceOptions): RequestHandler;
} 