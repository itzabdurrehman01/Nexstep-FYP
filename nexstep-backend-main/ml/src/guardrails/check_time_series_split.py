"""
ml/src/guardrails/check_time_series_split.py

Static AST Analyzer for Time-Series Split Violations.
Scans Python code for random splits (e.g. train_test_split with shuffle=True or default shuffle)
and random shuffling on data containing period/date/admission_cycle columns.
"""
import ast
import sys
import os

class TimeSeriesSplitVisitor(ast.NodeVisitor):
    def __init__(self, filename):
        self.filename = filename
        self.violations = []

    def visit_Call(self, node):
        func_name = ""
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            func_name = node.func.attr

        # Check train_test_split calls
        if func_name == "train_test_split":
            shuffle_found = False
            shuffle_val = None
            for kw in node.keywords:
                if kw.arg == "shuffle":
                    shuffle_found = True
                    if isinstance(kw.value, ast.Constant):
                        shuffle_val = kw.value.value

            if not shuffle_found:
                self.violations.append(
                    f"{self.filename}:{node.lineno} - train_test_split called without explicit shuffle=False. "
                    "Time-series models must use explicit walk-forward time splits."
                )
            elif shuffle_val is True:
                self.violations.append(
                    f"{self.filename}:{node.lineno} - train_test_split called with shuffle=True. "
                    "Random shuffling violates time-ordering in time-series data."
                )

        # Check random.shuffle or .sample calls
        if func_name in ["shuffle", "sample"]:
            self.violations.append(
                f"{self.filename}:{node.lineno} - Random sampling/shuffling call '{func_name}' detected. "
                "Ensure walk-forward time ordering is preserved for time-series features."
            )

        self.generic_visit(node)

def check_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        code = f.read()
    try:
        tree = ast.parse(code, filename=filepath)
        visitor = TimeSeriesSplitVisitor(filepath)
        visitor.visit(tree)
        return visitor.violations
    except SyntaxError as e:
        return [f"Syntax error parsing {filepath}: {e}"]

def scan_directory(dir_path):
    all_violations = []
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith(".py") and "guardrail" not in file:
                full_path = os.path.join(root, file)
                all_violations.extend(check_file(full_path))
    return all_violations

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..")
    violations = scan_directory(target) if os.path.isdir(target) else check_file(target)

    if violations:
        print("❌ Time-Series Split Violations Detected:")
        for v in violations:
            print("  -", v)
        sys.exit(1)
    else:
        print("✓ No time-series split violations found.")
        sys.exit(0)
