import { NextRequest, NextResponse } from "next/server"; 
import { getDB } from "@/lib/db"; 
import { chats } from "@/app/db/schema"; 
import { eq, and } from "drizzle-orm"; 
import { auth } from "@clerk/nextjs/server";  
 
export async function DELETE( 
  req: NextRequest, 
  { params }: { params: Promise<{ chatId: string }> } 
) { 
  try { 
    // Get the authenticated user 
    const { userId } = await auth(); 
    
    // Handle params whether it's a Promise or not
    const resolvedParams = await Promise.resolve(params);
    const chatId = resolvedParams.chatId;
     
    console.log("User ID:", userId); 
    console.log("Chat ID:", chatId); 
     
    if (!userId) { 
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
    } 
     
    if (!chatId) { 
      return NextResponse.json( 
        { error: "Chat ID is required" }, 
        { status: 400 } 
      ); 
    } 
     
    const db = await getDB(); 
     
    // Delete the chat with the specified id and user id 
    await db 
      .delete(chats) 
      .where( 
        and( 
          eq(chats.id, chatId), 
          eq(chats.createdBy, userId) 
        ) 
      ) 
      .execute(); 
       
    return NextResponse.json({ message: "Chat deleted successfully" }); 
  } catch (error) { 
    console.error("Error deleting chat:", error); 
    return NextResponse.json( 
      { error: "Failed to delete chat" }, 
      { status: 500 } 
    ); 
  } 
}