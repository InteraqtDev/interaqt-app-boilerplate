import {
    Action,
    Entity,
    Interaction,
    Payload,
    PayloadItem,
    Property,
    PropertyTypes,
    createUserRoleAttributive,
    State,
    Count,
    BoolExp,
    boolExpToAttributives,
    MapInteraction,
    MapInteractionItem,
} from "@interaqt/runtime";

const UserEntity = Entity.create({
    name: 'User',
    properties: [
        Property.create({name: 'name', type: PropertyTypes.String})
    ],
})
// 实体定义
const InventoryEntity = Entity.create({
    name: 'Inventory',
    properties: [
        Property.create({ name: 'itemId', type: PropertyTypes.String }),
        Property.create({ name: 'quantity', type: PropertyTypes.Number }),
    ],
});

const OrderEntity = Entity.create({
    name: 'Order',
    properties: [
        Property.create({ name: 'orderId', type: PropertyTypes.String }),
        Property.create({ name: 'supplierId', type: PropertyTypes.String }),
        Property.create({ name: 'status', type: PropertyTypes.String }),
        // Additional properties as required...
    ],
});

const GoodsEntity = Entity.create({
    name: 'Goods',
    properties: [
        Property.create({ name: 'goodsId', type: PropertyTypes.String }),
        Property.create({ name: 'orderRelated', type: PropertyTypes.String }),
        Property.create({ name: 'qualityCheck', type: PropertyTypes.String }),
        // Additional properties as required...
    ],
});

const SupplierEntity = Entity.create({
    name: 'Supplier',
    properties: [
        Property.create({ name: 'supplierId', type: PropertyTypes.String }),
        Property.create({ name: 'name', type: PropertyTypes.String }),
        // Additional properties as required...
    ],
});

// 用户角色定义
const inventoryClerkRole = createUserRoleAttributive({ name: 'inventoryClerk' });
const purchaseManagerRole = createUserRoleAttributive({ name: 'purchaseManager' });
const supplierRole = createUserRoleAttributive({ name: 'supplier' });

// 交互定义
const placeOrderInteraction = Interaction.create({
    name: 'placeOrder',
    action: Action.create({ name: 'placeOrder' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'order', base: OrderEntity }),
        ],
    }),
    userAttributives: purchaseManagerRole,
});

const selectSupplierInteraction = Interaction.create({
    name: 'selectSupplier',
    action: Action.create({ name: 'selectSupplier' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'supplier', base: SupplierEntity, isRef: true }),
            PayloadItem.create({ name: 'order', base: OrderEntity, isRef: true }),
        ],
    }),
    userAttributives: purchaseManagerRole,
});

const sendOrderInteraction = Interaction.create({
    name: 'sendOrder',
    action: Action.create({ name: 'sendOrder' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'order', base: OrderEntity, isRef: true }),
        ],
    }),
    userAttributives: purchaseManagerRole,
});

const receiveOrderInteraction = Interaction.create({
    name: 'receiveOrder',
    action: Action.create({ name: 'receiveOrder' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'goods', base: GoodsEntity }),
        ],
    }),
    userAttributives: inventoryClerkRole,
});

const inspectGoodsInteraction = Interaction.create({
    name: 'inspectGoods',
    action: Action.create({ name: 'inspectGoods' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'goods', base: GoodsEntity, isRef: true }),
        ],
    }),
    userAttributives: inventoryClerkRole,
});

const acceptGoodsInteraction = Interaction.create({
    name: 'acceptGoods',
    action: Action.create({ name: 'acceptGoods' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'goods', base: GoodsEntity, isRef: true }),
        ],
    }),
    userAttributives: inventoryClerkRole,
});

const rejectGoodsInteraction = Interaction.create({
    name: 'rejectGoods',
    action: Action.create({ name: 'rejectGoods' }),
    payload: Payload.create({
        items: [
            PayloadItem.create({ name: 'goods', base: GoodsEntity, isRef: true }),
        ],
    }),
    userAttributives: inventoryClerkRole,
});

// 全局状态定义
const totalOrdersState = State.create({
    name: 'totalOrders',
    type: PropertyTypes.Number,
    computedData: Count.create({
        record: OrderEntity,
        match: (record) => true,
    }),
});

// 计算数据类型定义
OrderEntity.properties.push(
    Property.create({
        name: 'status',
        type: PropertyTypes.String,
        computedData: MapInteraction.create({
            items: [
                MapInteractionItem.create({
                    interaction: placeOrderInteraction,
                    map: () => 'Placed',
                }),
                MapInteractionItem.create({
                    interaction: selectSupplierInteraction,
                    map: () => 'Supplier Selected',
                }),
                MapInteractionItem.create({
                    interaction: sendOrderInteraction,
                    map: () => 'Sent',
                }),
                MapInteractionItem.create({
                    interaction: receiveOrderInteraction,
                    map: () => 'Received',
                }),
                MapInteractionItem.create({
                    interaction: inspectGoodsInteraction,
                    map: (event) => event.payload.goods.qualityCheck === 'Passed' ? 'Accepted' : 'Rejected',
                }),
            ],
        }),
    })
);

// Export all the components
export const entities = [UserEntity, InventoryEntity, OrderEntity, GoodsEntity, SupplierEntity];
export const interactions = [
    placeOrderInteraction,
    selectSupplierInteraction,
    sendOrderInteraction,
    receiveOrderInteraction,
    inspectGoodsInteraction,
    acceptGoodsInteraction,
    rejectGoodsInteraction,
];
export const roles = [inventoryClerkRole, purchaseManagerRole, supplierRole];
export const states = [totalOrdersState];
export const activities = [];
