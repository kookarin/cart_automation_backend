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
                                        status: { type: 'string', example: 'OK' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/bigbasket/api/search': {
            get: {
                summary: 'Search BigBasket products',
                parameters: [
                    {
                        in: 'query',
                        name: 'q',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Search query string',
                        example: 'tomatoes'
                    },
                    {
                        in: 'query',
                        name: 'houseId',
                        required: true,
                        schema: { type: 'string' },
                        description: 'House identifier for cookie lookup',
                        example: '9928960679'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        products: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    product_id: { type: 'string' },
                                                    name: { type: 'string' },
                                                    brand: { type: 'string' },
                                                    weight: { type: 'string' },
                                                    unit: { type: 'string' },
                                                    price: { type: 'number' },
                                                    mrp: { type: 'number' },
                                                    discount: { type: 'number' },
                                                    available: { type: 'boolean' },
                                                    pack_desc: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            example: {
                                products: [
                                    {
                                        product_id: "40128746",
                                        name: "Tomato - Local",
                                        brand: "Fresho",
                                        weight: "1000",
                                        unit: "g",
                                        price: 24.00,
                                        mrp: 32.00,
                                        discount: 25,
                                        available: true,
                                        pack_desc: "1 kg"
                                    }
                                ]
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - Missing required parameters'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        },
        '/bigbasket/api/product-incremental': {
            get: {
                summary: 'Add product to cart incrementally',
                parameters: [
                    {
                        in: 'query',
                        name: 'prodId',
                        required: true,
                        schema: { type: 'number' },
                        description: 'Product ID',
                        example: 40128746
                    },
                    {
                        in: 'query',
                        name: 'term',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Search term used to find the product',
                        example: 'tomatoes'
                    },
                    {
                        in: 'query',
                        name: 'houseId',
                        required: true,
                        schema: { type: 'string' },
                        description: 'House identifier for cookie lookup',
                        example: '9928960679'
                    },
                    {
                        in: 'query',
                        name: 'count',
                        required: false,
                        schema: { type: 'number', default: 1 },
                        description: 'Number of items to add',
                        example: 2
                    }
                ],
                responses: {
                    '200': {
                        description: 'Product added successfully'
                    },
                    '400': {
                        description: 'Bad request - Missing required parameters'
                    },
                    '404': {
                        description: 'Product not found'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        },
        '/bigbasket/api/smart-select': {
            post: {
                summary: 'Get AI-powered product recommendations',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    searchTerm: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unit: { type: 'string' },
                                    pricePreference: { 
                                        type: 'string',
                                        enum: ['budget', 'value', 'premium']
                                    },
                                    preferences: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    houseId: { type: 'string' }
                                },
                                required: ['searchTerm', 'quantity', 'houseId']
                            }
                        },
                        example: {
                            searchTerm: "tomatoes",
                            quantity: 2,
                            unit: "kg",
                            pricePreference: "value",
                            preferences: ["organic"],
                            houseId: "9928960679"
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        searchTerm: { type: 'string' },
                                        recommendation: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    product_id: { type: 'string' },
                                                    count: { type: 'number' }
                                                }
                                            }
                                        },
                                        availableProducts: { type: 'number' },
                                        totalProducts: { type: 'number' }
                                    }
                                }
                            },
                            example: {
                                searchTerm: "tomatoes",
                                recommendation: [
                                    {
                                        product_id: "40128746",
                                        count: 2
                                    }
                                ],
                                availableProducts: 5,
                                totalProducts: 8
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - Missing required parameters'
                    },
                    '404': {
                        description: 'No products found'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        },
        '/bigbasket/api/process-cart': {
            post: {
                summary: 'Process entire shopping cart',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    house_identifier: { type: 'string' },
                                    cart: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                ingredient: { type: 'string' },
                                                'required quantity': { type: 'string' },
                                                preference: { type: 'string' }
                                            },
                                            required: ['ingredient', 'required quantity']
                                        }
                                    }
                                },
                                required: ['house_identifier', 'cart']
                            }
                        },
                        example: {
                            house_identifier: "9928960679",
                            cart: [
                                {
                                    ingredient: "tomatoes",
                                    "required quantity": "2 kg",
                                    preference: "organic"
                                },
                                {
                                    ingredient: "onions",
                                    "required quantity": "1.5 kg"
                                }
                            ]
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Cart processed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        house_identifier: { type: 'string' },
                                        overall_status: { 
                                            type: 'string',
                                            enum: ['success', 'partial_failure']
                                        },
                                        results: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    ingredient: { type: 'string' },
                                                    status: { 
                                                        type: 'string',
                                                        enum: ['success', 'failed', 'partial_success']
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            example: {
                                house_identifier: "9928960679",
                                overall_status: "success",
                                results: [
                                    {
                                        ingredient: "tomatoes",
                                        status: "success"
                                    },
                                    {
                                        ingredient: "onions",
                                        status: "success"
                                    }
                                ]
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - Invalid cart data'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        },
        '/text-to-cart': {
            post: {
                summary: 'Convert text description to structured cart format',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    cart: {
                                        type: 'string',
                                        description: 'Text description of shopping items',
                                        example: '2 kg tomatoes, 1 dozen eggs, 500g onions'
                                    }
                                },
                                required: ['cart']
                            }
                        },
                        example: {
                            cart: "2 kg tomatoes organic, 1.5 kg onions, 6 pieces banana"
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Successfully converted text to cart format',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        response: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    ingredient: { type: 'string' },
                                                    'required quantity': { type: 'string' },
                                                    preference: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            example: {
                                response: [
                                    {
                                        ingredient: "tomatoes",
                                        "required quantity": "2 kg",
                                        preference: "organic"
                                    },
                                    {
                                        ingredient: "onions",
                                        "required quantity": "1.5 kg"
                                    },
                                    {
                                        ingredient: "banana",
                                        "required quantity": "6 piece"
                                    }
                                ]
                            }
                        }
                    },
                    '400': {
                        description: 'Bad request - Missing cart text'
                    },
                    '500': {
                        description: 'Internal server error'
                    }
                }
            }
        }
    }
}; 