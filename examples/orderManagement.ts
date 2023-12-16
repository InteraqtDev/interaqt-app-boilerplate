import {
    Entity,
    Property,
    PropertyTypes,
    Relation,
    Interaction,
    Action,
    Payload,
    PayloadItem,
    createUserRoleAttributive,
    BoolExp,
    boolExpToAttributives,
    State,
    RelationCount,
    MapInteraction,
    MapInteractionItem,
    GetAction,
    Count,
    DataAttributive,
    boolExpToDataAttributives,
    RelationBasedAny,
    RelationBasedEvery
} from "@interaqt/runtime";

// 定义用户实体
const UserEntity = Entity.create({
    name: 'User',
    properties: [
        Property.create({ name: 'name', type: PropertyTypes.String }),
        Property.create({ name: 'roles', type: PropertyTypes.String, collection: true })
    ],
});

// 定义订单实体
const OrderEntity = Entity.create({
    name: 'Order',
    properties: [
        Property.create({ name: 'id', type: PropertyTypes.String }),
        Property.create({ name: 'customerId', type: PropertyTypes.String }),
        Property.create({ name: 'status', type: PropertyTypes.String }),
        Property.create({ name: 'totalAmount', type: PropertyTypes.Number }),
        // 其他需要的属性
    ],
});

// 用户角色定义
const adminRole = createUserRoleAttributive({ name: 'admin' });
const customerRole = createUserRoleAttributive({ name: 'customer' });

// 创建订单交互
const createOrderAction = Action.create({ name: 'createOrder' });
const orderPayload = Payload.create({
    items: [
        PayloadItem.create({ name: 'order', base: OrderEntity }),
        PayloadItem.create({ name: 'customerId', base: UserEntity, isRef: true })
    ]
});
const createOrderInteraction = Interaction.create({
    name: 'createOrder',
    action: createOrderAction,
    payload: orderPayload,
    userAttributives: adminRole,
});

// 修改订单交互
const updateOrderAction = Action.create({ name: 'updateOrder' });
const updateOrderInteraction = Interaction.create({
    name: 'updateOrder',
    action: updateOrderAction,
    payload: orderPayload,
    userAttributives: adminRole,
});

// 删除订单交互
const deleteOrderAction = Action.create({ name: 'deleteOrder' });
const deleteOrderInteraction = Interaction.create({
    name: 'deleteOrder',
    action: deleteOrderAction,
    payload: Payload.create({
        items: [PayloadItem.create({ name: 'orderId', base: OrderEntity, isRef: true })]
    }),
    userAttributives: adminRole,
});

// 查看订单列表交互
const getOrdersInteraction = Interaction.create({
    name: 'getOrders',
    action: GetAction,
    data: OrderEntity,
    userAttributives: boolExpToDataAttributives(BoolExp.atom(customerRole)),
});

// 查看订单详情交互
const getOrderDetailsInteraction = Interaction.create({
    name: 'getOrderDetails',
    action: GetAction,
    data: OrderEntity,
    userAttributives: boolExpToDataAttributives(BoolExp.atom(customerRole)),
});

// 全局状态和计算数据类型
const totalOrdersState = State.create({
    name: 'totalOrders',
    type: 'number',
    computedData: Count.create({
        record: OrderEntity,
        match: () => true
    })
});

// 实体和关系的 MapInteraction 计算
OrderEntity.properties.push(
    Property.create({
        name: 'status',
        type: PropertyTypes.String,
        collection: false,
        computedData: MapInteraction.create({
            items: [
                MapInteractionItem.create({
                    interaction: createOrderInteraction,
                    map: () => 'created',
                }),
                MapInteractionItem.create({
                    interaction: updateOrderInteraction,
                    map: (event) => event.payload.order.status,
                }),
                MapInteractionItem.create({
                    interaction: deleteOrderInteraction,
                    map: () => 'deleted',
                })
            ]
        })
    })
);

export const entities = [UserEntity, OrderEntity];
export const interactions = [
    createOrderInteraction,
    updateOrderInteraction,
    deleteOrderInteraction,
    getOrdersInteraction,
    getOrderDetailsInteraction
];
export const states = [totalOrdersState];
export const activities =[]
export const relations = []