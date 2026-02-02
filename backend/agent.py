import logging
import os
import sys
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    ChatContext,
    ChatMessage,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import (
    noise_cancellation,
    silero,
    groq,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from rag_engine import get_index

from tools.display_helpers import handle_show_menu_item
from tools.cart_helpers import (
    handle_add_item_to_cart,
    handle_remove_item_from_cart,
    handle_update_cart_quantity,
    handle_clear_cart,
    handle_get_cart_summary,
)
from tools.navigation_helpers import handle_go_to_menu, handle_cancel_payment
from tools.order_helpers import (
    handle_proceed_to_payment,
    handle_cancel_order,
    handle_modify_order,
)

logger = logging.getLogger("agent-Sage-17cf")

load_dotenv()

# Check API Key
if not os.getenv("GROQ_API_KEY"):
    print("WARNING: GROQ_API_KEY not found in environment!")
else:
    print("GROQ_API_KEY loaded successfully.")

# Global index getter to avoid reloading - or load in init
# Global variable for the index
_RAG_INDEX = None

def _get_rag_index():
    global _RAG_INDEX
    if _RAG_INDEX is None:
        _RAG_INDEX = get_index()
    return _RAG_INDEX

def search_menu(query: str) -> str:
    index = _get_rag_index()
    if index is None:
        return "No menu data is available."
    
    retriever = index.as_retriever(similarity_top_k=3)
    nodes = retriever.retrieve(query)
    if not nodes:
        return "No relevant menu information found."
        
    return "\n\n".join(n.text for n in nodes)


class RestaurantAssistant(Agent):
    """
    A voice AI assistant for restaurant ordering.
    """

    def __init__(self) -> None:
        # In-memory cart state for validation (frontend is source of truth)
        self._cart_items = []
        
        super().__init__(
            instructions="""You are a friendly restaurant ordering assistant for The Pizzeria, Delhi.
Your job: help the customer place pickup or delivery orders using ONLY the menu and rules in context.

CORE PRINCIPLES:
- Never invent items or prices. Always check menu context first.
- Ask clarifying questions (size, toppings, quantity, pickup vs delivery).
- Confirm the final order and total before placing.
- Be concise and polite.
- Your responses should be natural and conversational, suitable for voice interaction.

EDGE CASE HANDLING:
- ITEM NOT FOUND: If customer asks for items not in menu (sushi, steak, etc.), politely decline: \"I'm sorry, we specialize in Pizzas and Burgers. Would you like to see our Pizza menu?\"
- AMBIGUOUS ORDERS: If customer says \"I want a pizza\", ask clarifying questions: \"We have Cheese, Pepperoni, and Veggie. Which one would you like?\"
- DIETARY RESTRICTIONS: Answer dietary questions from menu context only. If unsure, admit it.
- CHANGE OF MIND: Use remove_item and add_item tools when a user changes their mind. Always confirm the new state.
- OFF-TOPIC: If customer asks about politics or code, politely redirect to ordering food.

FUNCTION USAGE:
- Use show_menu_item() when a user wants to see an item.
- Use add_item_to_cart() for adding items (ensure you get name, quantity, size).
- Use get_cart_summary() when the user asks for the total or cart status.
- Use proceed_to_payment() ONLY after confirming the full order with the user.""",
        )

    async def on_enter(self) -> None:
        """
        Called when the agent becomes active in the session.
        """
        await self.session.generate_reply(
            instructions="""Welcome to The Pizzeria, Delhi, what would you like to order today?""",
            allow_interruptions=False,
        )

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        """
        Called when the user finishes speaking, before the agent generates a response.
        """
        # Get the text content from the user's message
        user_query = new_message.text_content()
        print(f"DEBUG: User speech detected: '{user_query}'")
        logger.info(f"User speech detected: '{user_query}'")
        
        if user_query:
            # Search the menu/knowledge base for relevant information
            context = search_menu(user_query)
            
            # Inject the retrieved context into the chat context
            turn_ctx.add_message(
                role="assistant",
                content=f"Menu and rules context relevant to the user's query:\n{context}",
            )

    # Display tools
    @function_tool()
    async def show_menu_item(self, ctx: RunContext, item_name: str) -> str:
        """
        Show a visual representation (image) of a menu item to the customer.
        Use this when the user asks to see what something looks like.
        """
        return await handle_show_menu_item(self, item_name)

    # Cart management tools
    @function_tool()
    async def add_item_to_cart(
        self,
        ctx: RunContext,
        item_name: str,
        quantity: int = 1,
        size: str = None,
        price: float = 0.0,
        addons: list[str] = None,
    ) -> str:
        """
        Add an item to the customer's cart.
        
        Args:
            item_name: The name of the item to add.
            quantity: The number of items to add (default: 1).
            size: The size of the item, if applicable (e.g., "Small", "Medium", "Large").
            price: The price of the item. THIS MUST BE FOUND IN THE MENU CONTEXT.
            addons: A list of any extra toppings or customizations.
        """
        return await handle_add_item_to_cart(
            self, item_name, quantity, size, price, addons
        )

    @function_tool()
    async def remove_item_from_cart(self, ctx: RunContext, item_name: str) -> str:
        """
        Remove an item from the customer's cart.
        """
        return await handle_remove_item_from_cart(self, item_name)

    @function_tool()
    async def update_cart_quantity(
        self, ctx: RunContext, item_name: str, new_quantity: int
    ) -> str:
        """
        Update the quantity of a specific item in the customer's cart.
        """
        return await handle_update_cart_quantity(self, item_name, new_quantity)

    @function_tool()
    async def clear_cart(self, ctx: RunContext) -> str:
        """Clear all items from the customer's cart."""
        return await handle_clear_cart(self)

    @function_tool()
    async def get_cart_summary(self, ctx: RunContext) -> str:
        """Get a summary of the current cart contents and total."""
        return handle_get_cart_summary(self)

    # Navigation tools
    @function_tool()
    async def go_to_menu(self, ctx: RunContext) -> str:
        """Navigate the customer back to the menu page."""
        return await handle_go_to_menu(self)

    @function_tool()
    async def cancel_payment(self, ctx: RunContext) -> str:
        """Cancel the payment process and return to the menu."""
        return await handle_cancel_payment(self)

    # Order management tools
    @function_tool()
    async def proceed_to_payment(self, ctx: RunContext) -> str:
        """
        Proceed to the payment page when the customer confirms they are ready to pay.
        IMPORTANT: Only call this after the user has explicitly confirmed their order.
        """
        return await handle_proceed_to_payment(self)

    @function_tool()
    async def cancel_order(self, ctx: RunContext, order_id: str = None) -> str:
        """
        Cancel a confirmed order.
        """
        return await handle_cancel_order(self, order_id)

    @function_tool()
    async def modify_order(self, ctx: RunContext) -> str:
        """
        Modify a confirmed order.
        """
        return handle_modify_order(self)


server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info(f"Agent interacting with room: {ctx.room.name}")
    print(f"DEBUG: Agent interacting with room: {ctx.room.name}")
    session = AgentSession(
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            language="en"
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=RestaurantAssistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony() if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP else noise_cancellation.BVC(),
            ),
        ),
    )


if __name__ == "__main__":
    try:
        cli.run_app(server)
    except KeyboardInterrupt:
        print("\n\nAgent server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
