import json
import pandas as pd
import matplotlib.pyplot as plt
import os
import numpy as np

# Create results directory for images if not exists
os.makedirs('results/plots', exist_ok=True)

# 1. Load Data
data_path = 'results/word_order_stats.json'
with open(data_path, 'r', encoding='utf-8') as f:
    raw_data = json.load(f)

# 2. Flatten Data to DataFrame
records = []
for book, types in raw_data.items():
    for typ, patterns in types.items():
        for pattern, count in patterns.items():
            records.append({
                'Book': book,
                'ClauseType': typ,
                'Pattern': pattern,
                'Count': count
            })

df = pd.DataFrame(records)

# 3. Overall Top Patterns
top_patterns = df.groupby('Pattern')['Count'].sum().sort_values(ascending=False).head(15)
plt.figure(figsize=(12, 6))
top_patterns.plot(kind='bar', color='skyblue')
plt.title('Top 15 Word Order Patterns in Hebrew Bible')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('results/plots/overall_top_patterns.png')
print("Saved overall_top_patterns.png")

# 4. Pattern Distribution by Clause Type (Heatmap equivalent)
# Using Matplotlib imshow
top_10_patterns = top_patterns.head(10).index
pivot_type = df[df['Pattern'].isin(top_10_patterns)].pivot_table(
    index='ClauseType', columns='Pattern', values='Count', aggfunc='sum', fill_value=0
)

plt.figure(figsize=(12, 8))
plt.imshow(pivot_type, cmap='YlGnBu', aspect='auto')
plt.colorbar(label='Frequency')
plt.xticks(range(len(pivot_type.columns)), pivot_type.columns, rotation=45)
plt.yticks(range(len(pivot_type.index)), pivot_type.index)
plt.title('Clause Type vs Top 10 Word Order Patterns (Frequency)')

# Annotate heatmap
for i in range(len(pivot_type.index)):
    for j in range(len(pivot_type.columns)):
        text = plt.text(j, i, pivot_type.iloc[i, j],
                       ha="center", va="center", color="w" if pivot_type.iloc[i, j] > pivot_type.max().max()/2 else "black")

plt.tight_layout()
plt.savefig('results/plots/clause_type_heatmap.png')
print("Saved clause_type_heatmap.png")

# 5. Book Comparison (Stacked Bar for Top 5 Patterns)
top_5_patterns = top_patterns.head(5).index
df_top5 = df[df['Pattern'].isin(top_5_patterns)]

# Create a pivot table: Book x Pattern
pivot_book = df_top5.pivot_table(index='Book', columns='Pattern', values='Count', aggfunc='sum', fill_value=0)
book_order = list(raw_data.keys())
pivot_book = pivot_book.reindex(book_order)

pivot_book.plot(kind='bar', stacked=True, figsize=(16, 8), colormap='Set2')
plt.title('Distribution of Top 5 Word Order Patterns by Book')
plt.ylabel('Count')
plt.tight_layout()
plt.savefig('results/plots/book_distribution_stacked.png')
print("Saved book_distribution_stacked.png")

print("Visualization complete.")
