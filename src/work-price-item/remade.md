#### 迭代需求（但是需要保证原有的功能不变）
1. 以工种为单位的施工节点和辅材
2. 更改工价或辅材价格，不要对已生成的订单有影响

#### 我的方案
我感觉工价这里是不是可以重构一下，现在的逻辑是 以工种为单位的施工节点、辅材、施工记录，不需要区分子工价父工价这种：
工长订单的工价可以关联工长id和工匠id
工匠订单就关联工匠id


平台服务费和工长费用需要是数组：
第一次提交工价的时候计算
第二次提交工价重新计算减去第一次的钱再将第二次算出来的钱推入到 平台服务费和工长费数组
第三次次提交工价再次整体重新计算减去第一次和第二次的钱再将第三次算出来的钱推入到 平台服务费和工长费数组



1. 从这个接口开始改 /work-price-item/create ()
前端入参：
{
    "order_id": 233,
    "area": "90",
    "total_price": 0.13999999999999999,
    "work_price_list": [
        {
            "work_price_id": 58,
            "work_price": "0.01",
            "work_title": "2",
            "quantity": 2,
            "work_kind_name": "油漆",
            "work_kind_code": "YOUQI",
            "labour_cost_name": "间",
            "minimum_price": null,
            "is_set_minimum_price": "0"
        },
        {
            "work_price_id": 46,
            "work_price": "0.02",
            "work_title": "墙面乳胶漆施工",
            "quantity": 1,
            "work_kind_name": "油漆",
            "work_kind_code": "YOUQI",
            "labour_cost_name": "平方米",
            "minimum_price": "0.03",
            "is_set_minimum_price": "1"
        },
        {
            "work_price_id": 36,
            "work_price": "0.03",
            "work_title": "油漆-1111",
            "quantity": 1,
            "work_kind_name": "油漆",
            "work_kind_code": "YOUQI",
            "labour_cost_name": "平方米",
            "minimum_price": "0.04",
            "is_set_minimum_price": "1"
        },
        {
            "work_price_id": 45,
            "work_price": "0.01",
            "work_title": "水电-2222",
            "quantity": 1,
            "work_kind_name": "水电",
            "work_kind_code": "SHUIDIAN",
            "labour_cost_name": "平方米",
            "minimum_price": null,
            "is_set_minimum_price": "0"
        },
        {
            "work_price_id": 42,
            "work_price": "0.02",
            "work_title": "水电-1111",
            "quantity": 2,
            "work_kind_name": "水电",
            "work_kind_code": "SHUIDIAN",
            "labour_cost_name": "平方米",
            "minimum_price": "0.04",
            "is_set_minimum_price": "1"
        }
    ]
}

需要在 /api/order/233 返回所有工价

/api/order/233/sub-groups 接口已经废弃，全部在 /api/order/233 返回所有工价