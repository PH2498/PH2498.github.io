package com.dtcz.helloworld.service;

import com.dtcz.helloworld.model.dto.HelloWorldDTO;

/**
 * HelloWorld 业务服务接口。
 *
 * @author dtcz
 */
public interface HelloWorldService {

    /**
     * 获取问候消息。
     *
     * @return 问候消息 DTO
     */
    HelloWorldDTO getGreeting();
}