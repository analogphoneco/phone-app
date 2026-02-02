/**
 * Better error messages for users
 */

export interface AppError {
  title: string;
  message: string;
  action?: string;
}

export function parseError(error: unknown): AppError {
  if (typeof error === "string") {
    return parseErrorMessage(error);
  }
  
  if (error instanceof Error) {
    return parseErrorMessage(error.message);
  }
  
  if (typeof error === "object" && error !== null) {
    const err = error as any;
    if (err.message) {
      return parseErrorMessage(String(err.message));
    }
  }
  
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
  };
}

function parseErrorMessage(message: string): AppError {
  const lower = message.toLowerCase();
  
  // Network errors
  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("server unreachable")) {
    return {
      title: "Connection Error",
      message: "Unable to reach the server. Please check your internet connection and try again.",
      action: "Check Connection",
    };
  }
  
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return {
      title: "Request Timed Out",
      message: "The server took too long to respond. Please try again.",
      action: "Retry",
    };
  }
  
  // Authentication errors
  if (lower.includes("unauthorized") || lower.includes("api key") || lower.includes("invalid token")) {
    return {
      title: "Authentication Error",
      message: "Your session may have expired. Please sign out and sign in again.",
      action: "Sign Out",
    };
  }
  
  // Payment errors
  if (lower.includes("payment") || lower.includes("card") || lower.includes("stripe")) {
    if (lower.includes("declined")) {
      return {
        title: "Payment Declined",
        message: "Your payment method was declined. Please check your card details and try again.",
        action: "Update Payment",
      };
    }
    if (lower.includes("insufficient")) {
      return {
        title: "Insufficient Funds",
        message: "Your payment method has insufficient funds. Please use a different payment method.",
        action: "Change Card",
      };
    }
    return {
      title: "Payment Error",
      message: "There was a problem processing your payment. Please try again or use a different payment method.",
      action: "Try Again",
    };
  }
  
  // Subscription errors
  if (lower.includes("subscription")) {
    if (lower.includes("cancel")) {
      return {
        title: "Cancellation Failed",
        message: "Unable to cancel your subscription. Please try again or contact support.",
        action: "Contact Support",
      };
    }
    if (lower.includes("not found") || lower.includes("no active")) {
      return {
        title: "No Active Subscription",
        message: "You don't have an active subscription. Please subscribe to continue using the service.",
        action: "View Plans",
      };
    }
    return {
      title: "Subscription Error",
      message: "There was a problem with your subscription. Please try again.",
    };
  }
  
  // Phone number errors
  if (lower.includes("phone number") || lower.includes("number")) {
    if (lower.includes("unavailable") || lower.includes("not available")) {
      return {
        title: "Number Unavailable",
        message: "This phone number is no longer available. Please choose a different number.",
        action: "Choose Another",
      };
    }
    if (lower.includes("purchase") || lower.includes("provision")) {
      return {
        title: "Number Purchase Failed",
        message: "Unable to purchase this phone number. Please try a different number or contact support.",
        action: "Try Another",
      };
    }
  }
  
  // Voicemail errors
  if (lower.includes("voicemail")) {
    if (lower.includes("delete")) {
      return {
        title: "Delete Failed",
        message: "Unable to delete this voicemail. Please try again.",
      };
    }
    return {
      title: "Voicemail Error",
      message: "There was a problem with your voicemail. Please try again.",
    };
  }
  
  // Usage limit errors
  if (lower.includes("limit") || lower.includes("quota")) {
    return {
      title: "Usage Limit Reached",
      message: "You've reached your usage limit. Please upgrade your plan or wait until your limit resets.",
      action: "Upgrade Plan",
    };
  }
  
  // Server errors
  if (lower.includes("500") || lower.includes("internal server")) {
    return {
      title: "Server Error",
      message: "Our server encountered an error. Please try again in a few moments.",
      action: "Retry",
    };
  }
  
  if (lower.includes("503") || lower.includes("service unavailable")) {
    return {
      title: "Service Unavailable",
      message: "The service is temporarily unavailable. Please try again later.",
      action: "Retry Later",
    };
  }
  
  // Validation errors
  if (lower.includes("invalid") || lower.includes("malformed")) {
    return {
      title: "Invalid Input",
      message: "The information provided is invalid. Please check and try again.",
    };
  }
  
  // Generic with the original message if it's user-friendly
  if (message.length < 100 && !message.includes("Error:") && !message.includes("Failed")) {
    return {
      title: "Error",
      message: message,
    };
  }
  
  // Fallback
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again or contact support if the problem persists.",
    action: "Try Again",
  };
}

export function showError(error: unknown, onAction?: () => void) {
  const { title, message, action } = parseError(error);
  
  // You can use this with Alert.alert
  return {
    title,
    message,
    buttons: action && onAction
      ? [
          { text: "Cancel", style: "cancel" as const },
          { text: action, onPress: onAction },
        ]
      : [{ text: "OK" }],
  };
}
