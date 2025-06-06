from deap import gp
from pathlib import Path


def node_to_mql(node, args):
    """
    Converts a genetic programming tree node into its corresponding MQL expression string.
    
    Args:
        node: The node representing an operation or value in the genetic programming tree.
        args: A list of MQL expression strings for the node's child arguments.
    
    Returns:
        An MQL expression string representing the node's operation or value.
    """
    if node.name == 'add':
        return f"({args[0]} + {args[1]})"
    if node.name == 'sub':
        return f"({args[0]} - {args[1]})"
    if node.name == 'mul':
        return f"({args[0]} * {args[1]})"
    if node.name == 'protected_div':
        return f"({args[0]} / ({args[1]}==0?0.0001:{args[1]}))"
    if node.name == 'gt':
        return f"({args[0]} > {args[1]})"
    if node.name == 'lt':
        return f"({args[0]} < {args[1]})"
    if node.name == 'if_func':
        return f"(({args[0]}) ? ({args[1]}) : ({args[2]}))"
    return node.value


def export(individual, filepath):
    """
    Converts a genetic programming individual into an MQL function for generating trading signals and writes it to a file.
    
    The generated MQL function, `GenerateGPTradeSignal`, computes several technical indicators and evaluates the individual's expression tree to produce a trading signal: 1 for buy, -1 for sell, or 0 for neutral.
    
    Args:
        individual: A genetic programming individual representing an expression tree.
        filepath: The file path where the generated MQL code will be saved.
    """
    expr = gp.PrimitiveTree(individual)
    code_lines = [
        "int GenerateGPTradeSignal(int shift)",
        "{",
        "   double EMA50 = iMA(_Symbol, PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE, shift);",
        "   double EMA200 = iMA(_Symbol, PERIOD_M15, 200, 0, MODE_EMA, PRICE_CLOSE, shift);",
        "   double RSI14 = iRSI(_Symbol, PERIOD_M15, 14, PRICE_CLOSE, shift);",
        "   double ATR14 = iATR(_Symbol, PERIOD_M15, 14, shift);",
    ]

    def rec(node):
        """
        Recursively converts a genetic programming tree node into its MQL expression string.
        
        Traverses the expression tree in depth-first order, returning the node's value for leaves,
        or converting internal nodes using their child expressions and the `node_to_mql` function.
        """
        if node.arity == 0:
            return node.value
        args = [rec(ch) for ch in node.children]
        return node_to_mql(node, args)

    expr_str = rec(expr)
    code_lines.append(f"   double result = {expr_str};")
    code_lines.append("   if(result > 0) return 1;")
    code_lines.append("   if(result < 0) return -1;")
    code_lines.append("   return 0;")
    code_lines.append("}")

    Path(filepath).write_text("\n".join(code_lines))
