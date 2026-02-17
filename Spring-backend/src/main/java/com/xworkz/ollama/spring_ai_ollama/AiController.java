package com.xworkz.ollama.spring_ai_ollama;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/")
@CrossOrigin(origins = {"http://localhost:5173",
                 "https://spring-ai-model.vercel.app"})   // IMPORTANT
public class AiController {
    private final ChatClient chatClient;

    public AiController(ChatClient.Builder chatClient){
        this.chatClient=  chatClient.build();
    }

    @GetMapping("/ask")
    public String ask(@RequestParam String msg){
      return  chatClient.prompt(msg).call().content();
    }

}
