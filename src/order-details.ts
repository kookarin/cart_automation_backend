interface OrderItem {
    llc_n: string;
    weight: string;
    invoice_desc: string;
    sp: number;
    mrp: number;
    quantity: number;
}

interface OrderDetails {
    member: {
        first_name: string;
        last_name: string;
        contact_number: string;
        address1: string;
        address2: string;
        city: string;
        pin: number;
    };
    order_number: string;
    total_amount: number;
    wallet_used: number;
    order_amount: number;
    active_state: string;
    delivery_status_title: string;
    order_id: string;
    delivered_time: string;
    items: OrderItem[];
}

interface ParentOrder {
    member: {
        first_name: string;
        last_name: string;
        contact_number: string;
        address1: string;
        address2: string;
        city: string;
        pin: number;
    };
    total_order_amount: number;
    orders: any[];
}

export function extractOrderDetails(orderData: any): OrderDetails[] {
    const parentOrders = orderData.response.orders;
    
    return parentOrders.flatMap((parentOrder: ParentOrder) => {
        const member = parentOrder.member;
        
        return parentOrder.orders.map(order => {
            const activeState = order.states.find((state: any) => state.is_active)?.name || '';
            console.log(order.items);
            
            // Extract items from the nested line_items array
            const items = order.items?.flatMap((item: any) => 
                item.line_items?.map((lineItem: any) => ({
                    llc_n: lineItem.llc_n || '',
                    weight: lineItem.weight || '',
                    invoice_desc: lineItem.invoice_desc || '',
                    sp: Number(lineItem.sp) || 0,
                    mrp: Number(lineItem.mrp) || 0,
                    quantity: Number(lineItem.quantity) || 0
                })) || []
            ) || [];

            return {
                member: {
                    first_name: member.first_name,
                    last_name: member.last_name,
                    contact_number: member.contact_number,
                    address1: member.address1,
                    address2: member.address2,
                    city: member.city,
                    pin: member.pin
                },
                order_number: order.order_number,
                total_amount: Number(order.wallet_used) + Number(parentOrder.total_order_amount),
                wallet_used: Number(order.wallet_used),
                order_amount: Number(parentOrder.total_order_amount),
                active_state: activeState,
                delivery_status_title: order.delivery_status_title,
                order_id: order.order_id,
                delivered_time: order.status_time_details.delivered_time,
                items: items
            };
        });
    });
}

async function fetchOrdersFromBigBasket(): Promise<any> {
    const url = 'https://www.bigbasket.com/api/v1/order/orders?page=1&context=past';
    
    const headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'x-channel': 'BB-WEB',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
        'cookie': '_bb_locSrc=default; x-channel=web; _bb_bhid=; _bb_nhid=1723; _bb_vid=NTA4MDQ2NjgzOTE3MzcxMTE4; csrftoken=Xsxr9IMbcU3uLB9qBmrdKVBrATpTXPdJHM5jJZxzD6yfUx0JqG9Pr6Bi3Xrlv6wL; BBAUTHTOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaGFmZiI6IjFpUzdCQmx4RXN6SHNRIiwidGltZSI6MTc0MDY1MzM3NC4yNTI4NDQ2LCJtaWQiOjYyMDAwNDU5LCJ2aWQiOjUwODA0NjY4NTcyNTExNjkyOCwiZGV2aWNlX2lkIjoiV0VCIiwic291cmNlX2lkIjoxLCJlY19saXN0IjpbMyw0LDEwLDEyLDEzLDE0LDE1LDE2LDE3LDIwLDEwMF0sIlRETFRPS0VOIjoiOWM4NDY3OWUtMjdkZC00OTg3LWI2MDItZWM0NGIzMDVlYjk4IiwicmVmcmVzaF90b2tlbiI6ImZkY2RkYmY5LTZjNzYtNGZlZi1hNDJjLWE2NWZjNzA1ZjMxNCIsInRkbF9leHBpcnkiOjE3NDEyNTgxNzMsImV4cCI6MTc1NjQzMzM3NCwiaXNfc2FlIjpudWxsLCJkZXZpY2VfbW9kZWwiOiJXRUIiLCJkZXZpY2VfaXNfZGVidWciOiJmYWxzZSJ9.WSLumVk_1mZ1GsdAlH3_WbEFGp4wOdbTGmbPcHO3CWc'
    };

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

export async function getOrderDetails(): Promise<OrderDetails[]> {
    const orderData = await fetchOrdersFromBigBasket();
    return extractOrderDetails(orderData);
} 