import "server-only";
import { authorizePremiumStudyTool } from "@/lib/study-access";

export async function authorizeMath() {
  return authorizePremiumStudyTool("Matemática");
}

