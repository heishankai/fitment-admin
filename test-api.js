const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 测试统一响应格式
async function testApiResponse() {
  console.log('🚀 开始测试 API 接口响应格式...\n');

  const tests = [
    {
      name: 'GET /test - 查询参数测试',
      method: 'GET',
      url: '/test?name=test&value=123',
      expectedSuccess: true
    },
    {
      name: 'POST /post - POST请求测试',
      method: 'POST',
      url: '/post',
      data: { message: 'test data' },
      expectedSuccess: true
    },
    {
      name: 'GET /1 - 路径参数测试',
      method: 'GET',
      url: '/1',
      expectedSuccess: true
    },
    {
      name: 'GET /admin/users - 获取用户列表',
      method: 'GET',
      url: '/admin/users',
      expectedSuccess: true
    },
    {
      name: 'GET /admin/users/999 - 获取不存在的用户',
      method: 'GET',
      url: '/admin/users/999',
      expectedSuccess: false
    },
    {
      name: 'POST /admin/users - 创建用户（缺少必填字段）',
      method: 'POST',
      url: '/admin/users',
      data: { username: 'test' }, // 缺少password
      expectedSuccess: false
    },
    {
      name: 'POST /admin/login - 登录（缺少必填字段）',
      method: 'POST',
      url: '/admin/login',
      data: { username: 'test' }, // 缺少password
      expectedSuccess: false
    },
    {
      name: 'GET /example/success - 成功响应示例',
      method: 'GET',
      url: '/example/success',
      expectedSuccess: true
    },
    {
      name: 'GET /example/error - 错误响应示例',
      method: 'GET',
      url: '/example/error',
      expectedSuccess: false
    },
    {
      name: 'POST /example/validation - 验证错误示例',
      method: 'POST',
      url: '/example/validation',
      data: {}, // 缺少email字段
      expectedSuccess: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      let response;
      if (test.method === 'GET') {
        response = await axios.get(`${BASE_URL}${test.url}`);
      } else if (test.method === 'POST') {
        response = await axios.post(`${BASE_URL}${test.url}`, test.data);
      }

      // 检查响应格式
      const isValidFormat = checkResponseFormat(response.data, test.expectedSuccess);
      
      if (isValidFormat) {
        console.log(`✅ 通过 - 响应格式正确`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        passed++;
      } else {
        console.log(`❌ 失败 - 响应格式不正确`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        failed++;
      }
    } catch (error) {
      if (test.expectedSuccess) {
        console.log(`❌ 失败 - 期望成功但出现错误: ${error.message}`);
        failed++;
      } else {
        // 检查错误响应格式
        if (error.response && error.response.data) {
          const isValidErrorFormat = checkResponseFormat(error.response.data, false);
          if (isValidErrorFormat) {
            console.log(`✅ 通过 - 错误响应格式正确`);
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
            passed++;
          } else {
            console.log(`❌ 失败 - 错误响应格式不正确`);
            console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
            failed++;
          }
        } else {
          console.log(`❌ 失败 - 网络错误: ${error.message}`);
          failed++;
        }
      }
    }
    
    console.log(''); // 空行分隔
  }

  console.log('📊 测试结果汇总:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

// 检查响应格式是否符合统一标准
function checkResponseFormat(data, expectedSuccess) {
  // 检查必需字段
  if (!data.hasOwnProperty('success') || 
      !data.hasOwnProperty('data') || 
      !data.hasOwnProperty('code') || 
      !data.hasOwnProperty('message')) {
    return false;
  }

  // 检查success字段类型和值
  if (typeof data.success !== 'boolean') {
    return false;
  }

  // 检查success字段是否与期望一致
  if (data.success !== expectedSuccess) {
    return false;
  }

  // 检查code字段类型
  if (typeof data.code !== 'number') {
    return false;
  }

  // 检查message字段类型
  if (data.message !== null && typeof data.message !== 'string') {
    return false;
  }

  return true;
}

// 运行测试
testApiResponse().catch(console.error);
