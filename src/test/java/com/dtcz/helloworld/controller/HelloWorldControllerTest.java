package com.dtcz.helloworld.controller;

import com.dtcz.helloworld.common.model.ApiResponse;
import com.dtcz.helloworld.model.dto.HelloWorldDTO;
import com.dtcz.helloworld.service.HelloWorldService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * HelloWorldController 单元测试。
 *
 * @author dtcz
 */
@ExtendWith(MockitoExtension.class)
class HelloWorldControllerTest {

    @Mock
    private HelloWorldService helloWorldService;

    @InjectMocks
    private HelloWorldController helloWorldController;

    @Test
    @DisplayName("should return 200 with greeting when service returns valid DTO")
    void should_returnOkWithGreeting_when_serviceReturnsDTO() {
        HelloWorldDTO dto = new HelloWorldDTO();
        dto.setMessage("Hello, World!");
        when(helloWorldService.getGreeting()).thenReturn(dto);

        ApiResponse<HelloWorldDTO> response = helloWorldController.hello();

        assertThat(response).isNotNull();
        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getMessage()).isEqualTo("success");
        assertThat(response.getData()).isNotNull();
        assertThat(response.getData().getMessage()).isEqualTo("Hello, World!");
    }

    @Test
    @DisplayName("should return 200 with data even when message is empty")
    void should_returnOk_when_messageIsEmpty() {
        HelloWorldDTO dto = new HelloWorldDTO();
        dto.setMessage("");
        when(helloWorldService.getGreeting()).thenReturn(dto);

        ApiResponse<HelloWorldDTO> response = helloWorldController.hello();

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getData().getMessage()).isEmpty();
    }
}