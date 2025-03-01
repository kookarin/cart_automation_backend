export const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Grocery Backend API',
        version: '1.0.0',
        description: 'API documentation for the Grocery Backend service'
    },
    servers: [
        {
            url: 'http://localhost:5001',
            description: 'Local development server'
        }
    ],
    paths: {
        '/health': {
            get: {
                summary: 'Health check endpoint',
                responses: {
                    '200': {
                        description: 'Server is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            example: 'OK'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/zepto/api/search': {
            get: {
                summary: 'Search Zepto products',
                parameters: [
                    {
                        in: 'query',
                        name: 'q',
                        required: true,
                        schema: {
                            type: 'string'
                        },
                        description: 'Search query string'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            price: { type: 'number' },
                                            available: { type: 'boolean' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - Missing search query'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        }
    }
}; 