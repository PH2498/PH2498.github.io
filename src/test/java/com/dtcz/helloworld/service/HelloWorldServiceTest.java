package com.dtcz.helloworld.service;

import com.dtcz.helloworld.model.dto.HelloWorldDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * HelloWorldService 单元测试。
 *
 * @author dtcz
 */
class HelloWorldServiceTest {

    private final HelloWorldService helloWorldService = new HelloWorldServiceImpl();

    @Test
    @DisplayName("should return greeting message when getGreeting is called")
    void should_returnGreeting_when_getGreeting() {
        HelloWorldDTO result = helloWorldService.getGreeting();

        assertThat(result).isNotNull();
        assertThat(result.getMessage()).isNotBlank();
        assertThat(result.getMessage()).contains("Hello");
    }

    @Test
    @DisplayName("should return consistent greeting on multiple calls")
    void should_returnConsistentGreeting_when_multipleCalls() {
        HelloWorldDTO first = helloWorldService.getGreeting();
        HelloWorldDTO second = helloWorldService.getGreeting();

        assertThat(first.getMessage()).isEqualTo(second.getMessage());
    }
}