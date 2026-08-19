package com.dtcz.helloworld.controller;

import com.dtcz.helloworld.common.model.ApiResponse;
import com.dtcz.helloworld.model.dto.HelloWorldDTO;
import com.dtcz.helloworld.service.HelloWorldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HelloWorld REST 控制器。
 *
 * @author dtcz
 */
@RestController
@RequestMapping("/api")
public class HelloWorldController {

    private static final Logger logger = LoggerFactory.getLogger(HelloWorldController.class);

    private final HelloWorldService helloWorldService;

    public HelloWorldController(HelloWorldService helloWorldService) {
        this.helloWorldService = helloWorldService;
    }

    /**
     * 获取 HelloWorld 问候。
     *
     * @return 统一响应包含问候消息
     */
    @GetMapping("/hello_world")
    public ApiResponse<HelloWorldDTO> hello() {
        if (logger.isDebugEnabled()) {
            logger.debug("hello endpoint invoked");
        }
        HelloWorldDTO dto = helloWorldService.getGreeting();
        logger.info("hello endpoint response: {}", dto);
        return ApiResponse.success(dto);
    }
}