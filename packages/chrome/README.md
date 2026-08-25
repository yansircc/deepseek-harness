# Chrome capability family

The Chrome capability family separates provider-neutral command ownership from the local bridge implementation and model-facing tools. `@deepseek-ai/dsh-chrome-protocol` owns executable command and health vocabulary; `@deepseek-ai/dsh-chrome` owns the Cordis Service Definition and exact-Agent lifecycle. The local connector provider and `chrome_*` Consumer migrate into this family in subsequent slices.

Chrome remains a host-plane capability because its local bridge owns process-wide browser connector state. The Web UI card is a separate client Consumer.
