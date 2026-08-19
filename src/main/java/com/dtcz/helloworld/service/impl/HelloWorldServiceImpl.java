package com.dtcz.helloworld.service.impl;

import com.dtcz.helloworld.common.constant.HelloWorldConstants;
import com.dtcz.helloworld.model.dto.HelloWorldDTO;
import com.dtcz.helloworld.service.HelloWorldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * HelloWorld 业务服务实现。
 *
 * @author dtcz
 */
@Service
public class HelloWorldServiceImpl implements HelloWorldService {

    private static final Logger logger = LoggerFactory.getLogger(HelloWorldServiceImpl.class);

    @Override
    public HelloWorldDTO getGreeting() {
        if (logger.isDebugEnabled()) {
            logger.debug("getGreeting invoked");
        }
        HelloWorldDTO dto = new HelloWorldDTO();
        dto.setMessage(HelloWorldConstants.DEFAULT_GREETING);
        logger.info("getGreeting result: {}", dto);
        return dto;
    }
}